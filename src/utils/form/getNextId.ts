import { Record, Form, getRecordModel } from '@models';
import i18next from 'i18next';
import Redis from 'ioredis';
import config from 'config';
import { getDraftRecordFilter } from '@utils/filter';
import { FilterQuery } from 'mongoose';

/** Redis client holding the incremental id counters */
const redis = new Redis(config.get('redis.url'), {
  password: config.get('redis.password'),
  showFriendlyErrorStack: true,
  lazyConnect: true,
  maxRetriesPerRequest: 5,
});

/** Default start padding size for the IDs */
const PADDING_MAX_LENGTH = 8;

/** Shape of a well-formed incremental id: `<year>-<letter><number>` */
const INCREMENTAL_ID_REGEX = /^\d{4}-[A-Z]\d+$/;

/**
 * Redis key of the counter of a structure for a given year.
 * The year is part of the key so the numbering restarts every year.
 *
 * @param structureId Id of the form / resource.
 * @param year Year of the counter.
 * @returns Redis key.
 */
const counterKey = (structureId: string, year: string) =>
  `incrementalId:count:${structureId}:${year}`;

/**
 * Redis key of the letter used in the incremental ids of a structure.
 *
 * @param structureId Id of the form / resource.
 * @returns Redis key.
 */
const letterKey = (structureId: string) =>
  `incrementalId:letter:${structureId}`;

/**
 * Formats an incremental id.
 *
 * @param year Year of the id.
 * @param letter Letter of the structure.
 * @param count Counter value.
 * @returns Formatted incremental id.
 */
const formatId = (year: string, letter: string, count: number) =>
  `${year}-${letter}${String(count).padStart(PADDING_MAX_LENGTH, '0')}`;

/**
 * Gets the letter used in the incremental ids of a structure: the one of the
 * existing ids if any, so it stays stable across years and form renames,
 * otherwise the first letter of the form name.
 *
 * @param structureId Id of the form / resource.
 * @param structureFilter Filter selecting the submitted records of the structure.
 * @returns Letter of the structure.
 */
const resolveLetter = async (
  structureId: string,
  structureFilter: FilterQuery<Record>
): Promise<string> => {
  const lastRecord = await Record.findOne(
    { ...structureFilter, incrementalId: { $regex: INCREMENTAL_ID_REGEX } },
    'incrementalId'
  ).sort({ incrementalId: -1 });
  if (lastRecord) {
    return lastRecord.incrementalId[5];
  }
  const form = await Form.findOne({
    $or: [{ _id: structureId }, { resource: structureId, core: true }],
  }).select('name');
  if (!form?.name) {
    throw new Error(
      i18next.t('utils.form.getNextId.errors.incrementalIdError')
    );
  }
  return form.name[0].toUpperCase();
};

/**
 * Initializes the counter of a structure for the current year, from the
 * highest incremental id already stored. The highest id is not necessarily
 * on the most recently created record: drafts only get their id when they
 * are published, which can be long after newer records were submitted.
 *
 * Submitted records that never got an incremental id are numbered as well.
 *
 * @param key Redis key of the counter.
 * @param year Current year.
 * @param letter Letter of the structure.
 * @param structureFilter Filter selecting the submitted records of the structure.
 */
const initCounter = async (
  key: string,
  year: string,
  letter: string,
  structureFilter: FilterQuery<Record>
): Promise<void> => {
  const lastRecord = await Record.findOne(
    { ...structureFilter, incrementalId: { $regex: `^${year}-[A-Z]\\d+$` } },
    'incrementalId'
  ).sort({ incrementalId: -1 });
  const max = lastRecord ? Number(lastRecord.incrementalId.substring(6)) : 0;
  // NX: if another instance initialized the counter in the meantime, its value
  // is kept, as ids may already have been taken from it
  const initialized = await redis.set(key, max, 'NX');
  if (initialized !== 'OK') {
    return;
  }
  const legacyRecords = await Record.find(
    { ...structureFilter, incrementalId: { $in: [null, ''] } },
    '_id storage'
  ).sort({ createdAt: 1 });
  if (!legacyRecords.length) {
    return;
  }
  const bulkUpdateOps = [];
  // Records stored in a storage database are numbered there too: the main
  // database only holds their stubs
  const storedOps: { [storage: string]: any[] } = {};
  for (const record of legacyRecords) {
    const count = await redis.incr(key);
    const op = {
      updateOne: {
        filter: { _id: record._id },
        update: { incrementalId: formatId(year, letter, count) },
      },
    };
    bulkUpdateOps.push(op);
    if (record.storage) {
      (storedOps[record.storage] ??= []).push(op);
    }
  }
  await Record.bulkWrite(bulkUpdateOps);
  for (const [storage, ops] of Object.entries(storedOps)) {
    await getRecordModel(storage).bulkWrite(ops);
  }
};

/**
 * Gets next id of a form / resource, based on previous records.
 * Updates previous records if needed.
 *
 * Ids are taken from an atomic Redis counter per structure and year, so
 * concurrent calls never get the same id. The counter is initialized from the
 * database when missing (first call of the year, or Redis flushed).
 *
 * @param structureId Id of the form / resource.
 * @returns New id for the record.
 */
export const getNextId = async (structureId: string): Promise<string> => {
  const year = String(new Date().getFullYear());
  const structureFilter: FilterQuery<Record> = {
    $or: [{ resource: structureId }, { form: structureId }],
    ...getDraftRecordFilter(),
  };

  let letter = await redis.get(letterKey(structureId));
  if (!letter) {
    letter = await resolveLetter(structureId, structureFilter);
    await redis.set(letterKey(structureId), letter);
  }

  const key = counterKey(structureId, year);
  if (!(await redis.exists(key))) {
    await initCounter(key, year, letter, structureFilter);
  }
  const count = await redis.incr(key);
  return formatId(year, letter, count);
};
