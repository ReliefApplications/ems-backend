import mongoose from 'mongoose';
import { Record } from '@models';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description =
  'Set data.cecis_number (UA#### / NC######) and data.case_id (<year>-C######## / <year>-M########) on existing Case records, and enable pre-images on the records collection for the records-case-identifiers Atlas trigger.';

/** Case resource */
const RESOURCE_ID = new mongoose.Types.ObjectId('6a1f45cbec51d33e953e4a52');
/** Bulk write chunk size */
const CHUNK_SIZE = 500;

/** cecis_number rules, keyed by the value of cecis_case */
const CECIS_FORMATS: {
  [key: string]: { prefix: string; digits: number; pattern: RegExp };
} = {
  true: { prefix: 'UA', digits: 4, pattern: /^UA(\d{4,})$/ },
  false: { prefix: 'NC', digits: 6, pattern: /^NC(\d{6,})$/ },
};
/** case_id letter, keyed by the value of military */
const CASE_ID_LETTERS: { [key: string]: string } = { true: 'M', false: 'C' };
/** case_id digits */
const CASE_ID_DIGITS = 8;
/** Any well-formed case_id */
const CASE_ID_PATTERN = /^\d{4}-[CM](\d{8,})$/;

/** Record shape used by this migration */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 *
 */
interface CaseRecord {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  data?: {
    cecis_case?: any;
    cecis_number?: any;
    military?: any;
    case_id?: any;
  };
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Sequential allocator for `<prefix><zero-padded number>` values.
 * Existing valid values are registered first (oldest record wins on duplicates),
 * then missing ones are allocated after the highest known sequence per prefix.
 */
class Allocator {
  private maxSeq: { [prefix: string]: number } = {};

  private used = new Set<string>();

  /**
   * Registers an existing value if valid and not already used.
   *
   * @param value existing value
   * @param prefix expected prefix
   * @param seq numeric part
   * @returns true if the value was kept
   */
  keep(value: string, prefix: string, seq: number): boolean {
    if (this.used.has(value)) {
      return false;
    }
    this.used.add(value);
    this.maxSeq[prefix] = Math.max(this.maxSeq[prefix] || 0, seq);
    return true;
  }

  /**
   * Allocates the next value for a prefix.
   *
   * @param prefix value prefix
   * @param digits zero-padding of the numeric part
   * @returns new value
   */
  next(prefix: string, digits: number): string {
    let value: string;
    do {
      this.maxSeq[prefix] = (this.maxSeq[prefix] || 0) + 1;
      value = `${prefix}${String(this.maxSeq[prefix]).padStart(digits, '0')}`;
    } while (this.used.has(value));
    this.used.add(value);
    return value;
  }

  /** @returns highest sequence per prefix */
  get summary(): string {
    return Object.entries(this.maxSeq)
      .map(([prefix, seq]) => `${prefix}=${seq}`)
      .join(', ');
  }
}

/**
 * Assign cecis numbers and case ids to existing records.
 */
export const up = async () => {
  await startDatabaseForMigration();

  const records: CaseRecord[] = await Record.find(
    { resource: RESOURCE_ID },
    {
      _id: 1,
      createdAt: 1,
      'data.cecis_case': 1,
      'data.cecis_number': 1,
      'data.military': 1,
      'data.case_id': 1,
    }
  )
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const cecis = new Allocator();
  const caseIds = new Allocator();
  const missingCecis: { id: mongoose.Types.ObjectId; cecisCase: boolean }[] =
    [];
  const missingCaseId: { id: mongoose.Types.ObjectId; prefix: string }[] = [];
  const stats = { keptCecis: 0, keptCaseId: 0, noCecisCase: 0, noMilitary: 0 };

  // Pass 1: keep valid, unique existing identifiers and find the highest sequences.
  for (const record of records) {
    const data = record.data || {};

    if (typeof data.cecis_case === 'boolean') {
      const fmt = CECIS_FORMATS[String(data.cecis_case)];
      const match =
        typeof data.cecis_number === 'string'
          ? data.cecis_number.match(fmt.pattern)
          : null;
      if (
        match &&
        cecis.keep(data.cecis_number, fmt.prefix, Number(match[1]))
      ) {
        stats.keptCecis += 1;
      } else {
        missingCecis.push({ id: record._id, cecisCase: data.cecis_case });
      }
    } else {
      stats.noCecisCase += 1;
    }

    if (typeof data.military === 'boolean') {
      const year = (record.createdAt || new Date()).getFullYear();
      const prefix = `${year}-${CASE_ID_LETTERS[String(data.military)]}`;
      const match =
        typeof data.case_id === 'string'
          ? data.case_id.match(CASE_ID_PATTERN)
          : null;
      if (
        match &&
        data.case_id.startsWith(prefix) &&
        caseIds.keep(data.case_id, prefix, Number(match[1]))
      ) {
        stats.keptCaseId += 1;
      } else {
        missingCaseId.push({ id: record._id, prefix });
      }
    } else {
      stats.noMilitary += 1;
    }
  }

  // Pass 2: allocate missing identifiers, in creation order.
  const updates = new Map<string, { [path: string]: string }>();
  const addUpdate = (id: mongoose.Types.ObjectId, path: string, v: string) => {
    const key = id.toHexString();
    updates.set(key, { ...(updates.get(key) || {}), [path]: v });
  };
  for (const { id, cecisCase } of missingCecis) {
    const fmt = CECIS_FORMATS[String(cecisCase)];
    addUpdate(id, 'data.cecis_number', cecis.next(fmt.prefix, fmt.digits));
  }
  for (const { id, prefix } of missingCaseId) {
    addUpdate(id, 'data.case_id', caseIds.next(prefix, CASE_ID_DIGITS));
  }

  const bulkOps = [...updates.entries()].map(([id, $set]) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(id) },
      update: { $set },
    },
  }));
  for (let i = 0; i < bulkOps.length; i += CHUNK_SIZE) {
    await Record.bulkWrite(bulkOps.slice(i, i + CHUNK_SIZE), {
      ordered: false,
    });
  }

  // Enable pre-images so the trigger receives fullDocumentBeforeChange.
  try {
    await mongoose.connection.db.command({
      collMod: Record.collection.name,
      changeStreamPreAndPostImages: { enabled: true },
    });
    console.log(`Pre-images enabled on ${Record.collection.name}`);
  } catch (err) {
    console.warn(
      `Could not enable pre-images on ${Record.collection.name} (enable them manually in Atlas): ${err.message}`
    );
  }

  console.log(
    `Case records: ${records.length} found, ${updates.size} updated.`
  );
  console.log(
    `cecis_number: ${stats.keptCecis} kept, ${missingCecis.length} assigned, ${stats.noCecisCase} skipped (cecis_case not set). Highest: ${cecis.summary}`
  );
  console.log(
    `case_id: ${stats.keptCaseId} kept, ${missingCaseId.length} assigned, ${stats.noMilitary} skipped (military not set). Highest: ${caseIds.summary}`
  );
};

/**
 * Nothing to revert: assigned identifiers are kept.
 */
export const down = async () => {
  console.log(
    'Nothing to revert: cecis_number and case_id values are kept on records.'
  );
};
