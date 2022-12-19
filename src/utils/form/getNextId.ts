import { Record, Form } from '@models';
import NodeCache from 'node-cache';
import mongoose from 'mongoose';
import i18next from 'i18next';

/** Internal node cache object instance */
const cache = new NodeCache();

/** Default start padding size for the IDs */
const PADDING_MAX_LENGTH = 8;

/**
 * Gets next id of a form / resource, based on previous records.
 * Updates previous records if needed.
 *
 * @param structureId Id of the form / resource.
 * @returns New id for the record.
 */
export const getNextId = async (structureId: string): Promise<string> => {
  // Get previous ID from cache
  let previousId: string = cache.get(structureId);
  let nextId: string;
  const currentYear = String(new Date().getFullYear());
  // If not cached, get it from the DB
  if (!previousId) {
    const lastRecord = await Record.findOne(
      { $or: [{ resource: structureId }, { form: structureId }] },
      'incrementalId'
    )
      .sort({ _id: -1 })
      .limit(1);
    // If it's the first record or previous record does not have an incremental ID, create one from scratch
    if (!lastRecord || (lastRecord && !lastRecord.incrementalId)) {
      const formName = (
        await Form.findOne({
          $or: [{ _id: structureId }, { resource: structureId, core: true }],
        }).select('name')
      ).name;
      previousId = `${currentYear}-${formName[0].toUpperCase()}${String(
        0
      ).padStart(PADDING_MAX_LENGTH, '0')}`;

      // If previous records does not have an incremental ID, update them with incremental IDs
      if (lastRecord && !lastRecord.incrementalId) {
        const records = await Record.find(
          { $or: [{ resource: structureId }, { form: structureId }] },
          'id'
        ).sort({ createdAt: 1 });
        const bulkUpdateOps = [];
        for (const record of records) {
          previousId = `${previousId.substring(0, 6)}${String(
            Number(previousId.substring(6)) + 1
          ).padStart(PADDING_MAX_LENGTH, '0')}`;
          bulkUpdateOps.push({
            updateOne: {
              filter: { _id: mongoose.Types.ObjectId(record.id) },
              update: { incrementalId: previousId },
            },
          });
        }
        Record.bulkWrite(bulkUpdateOps);
      }
    } else {
      previousId = lastRecord.incrementalId;
    }
  }

  // Get next ID
  if (previousId) {
    // Increment the ID or restart the counting if it's a new year
    if (currentYear === previousId.substring(0, 4)) {
      nextId = `${previousId.substring(0, 6)}${String(
        Number(previousId.substring(6)) + 1
      ).padStart(PADDING_MAX_LENGTH, '0')}`;
    } else {
      nextId = `${currentYear}-${previousId[5]}${String(1).padStart(
        PADDING_MAX_LENGTH,
        '0'
      )}`;
    }
    cache.set(structureId, nextId);
  } else {
    throw new Error(
      i18next.t('utils.form.getNextId.errors.incrementalIdError')
    );
  }
  return nextId;
};
