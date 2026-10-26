import {
  Form,
  Record,
  Resource,
  Version,
  getRecordModel,
  getVersionModel,
} from '@models';
import { FilterQuery, Types } from 'mongoose';
import {
  StorageForm,
  invalidateStorageRegistry,
  resolveStructureStorage,
} from './registry';
import { STUB_FIELDS, syncStubs, toStub } from './stubs';

/** Options of the storage operations */
export interface StorageOperationOptions {
  /** Number of records handled per batch */
  batchSize?: number;
  /** Progress logger */
  log?: (message: string) => void;
}

/** Result of a consistency pass on a structure */
export interface ReconcileReport {
  /** Records stored in full in the main database, moved */
  moved: number;
  /** Stubs created or refreshed */
  synced: number;
  /** Stubs without record, deleted */
  orphans: number;
}

/** A structure whose records are stored together: a resource, or a standalone form */
export interface StorageStructure {
  /** Id of the resource, or of the standalone form */
  id: Types.ObjectId;
  /** Name of the resource or form */
  name: string;
  /** Filter selecting the records of the structure */
  filter: FilterQuery<Record>;
  /** Forms of the structure */
  forms: StorageForm[];
  /** Name of the storage database set on the forms, if any */
  storage?: string;
}

/** Default number of records handled per batch */
const DEFAULT_BATCH_SIZE = 500;

/**
 * Inserts documents directly in a collection, ignoring the ones already there.
 * Makes the copies idempotent, so an interrupted operation can be run again.
 *
 * @param model Model of the collection
 * @param docs Documents to insert
 */
const insertIgnoringDuplicates = async (model: any, docs: any[]) => {
  if (!docs.length) {
    return;
  }
  try {
    await model.collection.insertMany(docs, { ordered: false });
  } catch (err) {
    const errors: any[] = err.writeErrors ?? [err];
    if (!errors.every((e) => (e.code ?? e.err?.code) === 11000)) {
      throw err;
    }
  }
};

/**
 * Gets a structure from the id of a resource or of a form. The id of a form
 * belonging to a resource gives the resource.
 *
 * @param id Id of the resource or form
 * @returns The structure
 */
export const getStorageStructure = async (
  id: Types.ObjectId | string
): Promise<StorageStructure> => {
  const select = '_id resource core storage name';
  const resource = await Resource.findById(id).select('_id name');
  if (resource) {
    const forms: StorageForm[] = await Form.find({ resource: resource._id })
      .select(select)
      .lean();
    return {
      id: resource._id,
      name: resource.name,
      filter: { resource: resource._id },
      forms,
      storage: resolveStructureStorage(forms),
    };
  }
  const form: any = await Form.findById(id).select(select).lean();
  if (!form) {
    throw new Error(`No resource or form with id ${id}`);
  }
  if (form.resource) {
    return getStorageStructure(form.resource);
  }
  return {
    id: form._id,
    name: form.name,
    filter: { form: form._id },
    forms: [form],
    storage: form.storage,
  };
};

/**
 * Lists the structures with a storage database.
 *
 * @returns The structures
 */
export const getStorageStructures = async (): Promise<StorageStructure[]> => {
  const flagged: any[] = await Form.find({
    storage: { $exists: true, $nin: [null, ''] },
  })
    .select('_id resource')
    .lean();
  const ids = [...new Set(flagged.map((x) => String(x.resource ?? x._id)))];
  return Promise.all(ids.map((id) => getStorageStructure(id)));
};

/**
 * Moves a batch of records from the main database to a storage database,
 * with their versions, and leaves stubs in their place.
 *
 * @param docs Records, as stored in the main database
 * @param storage Name of the storage database
 */
const moveBatch = async (docs: any[], storage: string) => {
  const stored = getRecordModel(storage);
  const storedVersion = getVersionModel(storage);
  const ids = docs.map((x) => x._id);
  const versionIds: any[] = docs.flatMap((x) => x.versions || []);
  // Versions first: a record must never exist without its versions
  if (versionIds.length) {
    const versions = await Version.find({ _id: { $in: versionIds } }).lean();
    await insertIgnoringDuplicates(storedVersion, versions);
  }
  const full = docs.map((x) => ({ ...x, storage }));
  await insertIgnoringDuplicates(stored, full);
  const copied = await stored.countDocuments({ _id: { $in: ids } });
  if (copied !== ids.length) {
    throw new Error(
      `Only ${copied} of ${ids.length} records found in ${storage} after copy`
    );
  }
  // The records are safe in the storage database: replace them by stubs
  await Record.collection.bulkWrite(
    full.map((x) => ({
      replaceOne: { filter: { _id: x._id }, replacement: toStub(x) },
    })),
    { ordered: false }
  );
  // Then drop their versions from the main database, unless a record still
  // stored there uses them
  if (versionIds.length) {
    const used = new Set(
      (
        await Record.distinct('versions', {
          storage: { $exists: false },
          versions: { $in: versionIds },
        })
      ).map(String)
    );
    await Version.deleteMany({
      _id: { $in: versionIds.filter((x) => !used.has(String(x))) },
    });
  }
};

/**
 * Moves the records of a structure still stored in full in the main database
 * to its storage database.
 *
 * @param structure The structure
 * @param options Operation options
 * @returns Number of records moved
 */
const moveStrayRecords = async (
  structure: StorageStructure,
  options: StorageOperationOptions
): Promise<number> => {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  let moved = 0;
  for (;;) {
    const docs = await Record.find({
      ...structure.filter,
      storage: { $exists: false },
    })
      .limit(batchSize)
      .lean();
    if (!docs.length) {
      return moved;
    }
    await moveBatch(docs, structure.storage);
    moved += docs.length;
    options.log?.(`${moved} records moved to ${structure.storage}`);
  }
};

/**
 * Gets the structure of a storage operation, with its storage checked.
 *
 * @param id Id of the resource or form
 * @returns The structure
 */
const getStoredStructure = async (id: Types.ObjectId | string) => {
  const structure = await getStorageStructure(id);
  if (!structure.storage) {
    throw new Error(
      `${structure.name} has no storage database: set the storage on its form first`
    );
  }
  return structure;
};

/**
 * Makes the main database consistent with the storage database of a
 * structure: moves the records still stored in full in the main database,
 * creates or refreshes the stubs of the stored records, and deletes the stubs
 * without record. The storage database is the source of truth.
 *
 * @param id Id of the resource or form
 * @param options Operation options
 * @returns What was fixed
 */
export const reconcileStorage = async (
  id: Types.ObjectId | string,
  options: StorageOperationOptions = {}
): Promise<ReconcileReport> => {
  const structure = await getStoredStructure(id);
  const { storage } = structure;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const stored = getRecordModel(storage);
  const moved = await moveStrayRecords(structure, options);
  // Stubs of every stored record, in batches ordered by id
  let synced = 0;
  let lastId: any = null;
  for (;;) {
    const docs: any[] = await stored
      .find({ ...structure.filter, ...(lastId && { _id: { $gt: lastId } }) })
      .select(STUB_FIELDS.join(' '))
      .sort({ _id: 1 })
      .limit(batchSize)
      .lean();
    if (!docs.length) {
      break;
    }
    await syncStubs(docs.map((x) => ({ ...x, storage })));
    synced += docs.length;
    lastId = docs[docs.length - 1]._id;
    options.log?.(`${synced} stubs synced`);
  }
  // Stubs pointing to records that no longer exist
  let orphans = 0;
  lastId = null;
  for (;;) {
    const stubs: any[] = await Record.find({
      ...structure.filter,
      storage,
      ...(lastId && { _id: { $gt: lastId } }),
    })
      .select('_id')
      .sort({ _id: 1 })
      .limit(batchSize)
      .lean();
    if (!stubs.length) {
      break;
    }
    const ids = stubs.map((x) => x._id);
    const existing = new Set(
      (
        await stored
          .find({ _id: { $in: ids } })
          .select('_id')
          .lean()
      ).map((x) => String(x._id))
    );
    const missing = ids.filter((x) => !existing.has(String(x)));
    if (missing.length) {
      await Record.collection.deleteMany({ _id: { $in: missing } });
      orphans += missing.length;
    }
    lastId = ids[ids.length - 1];
  }
  options.log?.(
    `${structure.name}: ${moved} moved, ${synced} synced, ${orphans} orphans`
  );
  return { moved, synced, orphans };
};

/**
 * Moves the records and versions of a structure to the storage database set
 * on its forms. The application should be stopped meanwhile: records created
 * in the main database during the move are caught by the final consistency
 * pass, but the structure is unavailable until the move completes.
 *
 * Can be run again after an interruption.
 *
 * @param id Id of the resource or form
 * @param options Operation options
 * @returns What was done
 */
export const moveStorage = async (
  id: Types.ObjectId | string,
  options: StorageOperationOptions = {}
): Promise<ReconcileReport> => {
  const structure = await getStoredStructure(id);
  // Indexes before any data, so the collections are usable at once
  await getRecordModel(structure.storage).createIndexes();
  await getVersionModel(structure.storage).createIndexes();
  invalidateStorageRegistry();
  return reconcileStorage(structure.id, options);
};

/**
 * Moves the records and versions of a structure back to the main database,
 * removes the storage setting from its forms, and drops the collections of
 * the storage database once empty. The application should be stopped
 * meanwhile.
 *
 * @param id Id of the resource or form
 * @param options Operation options
 * @returns Number of records moved back
 */
export const revertStorage = async (
  id: Types.ObjectId | string,
  options: StorageOperationOptions = {}
): Promise<number> => {
  const structure = await getStoredStructure(id);
  const { storage } = structure;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const stored = getRecordModel(storage);
  const storedVersion = getVersionModel(storage);
  let moved = 0;
  for (;;) {
    const docs: any[] = await stored
      .find(structure.filter)
      .limit(batchSize)
      .lean();
    if (!docs.length) {
      break;
    }
    const ids = docs.map((x) => x._id);
    const versionIds: any[] = docs.flatMap((x) => x.versions || []);
    if (versionIds.length) {
      const versions = await storedVersion
        .find({ _id: { $in: versionIds } })
        .lean();
      await insertIgnoringDuplicates(Version, versions);
    }
    // Full documents take the place of the stubs
    await Record.collection.bulkWrite(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      docs.map(({ storage: _storage, ...doc }) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      })),
      { ordered: false }
    );
    const copied = await Record.countDocuments({
      _id: { $in: ids },
      storage: { $exists: false },
    });
    if (copied !== ids.length) {
      throw new Error(
        `Only ${copied} of ${ids.length} records found in the main database after copy`
      );
    }
    await stored.collection.deleteMany({ _id: { $in: ids } });
    if (versionIds.length) {
      const used = new Set(
        (
          await stored.distinct('versions', { versions: { $in: versionIds } })
        ).map(String)
      );
      await storedVersion.collection.deleteMany({
        _id: { $in: versionIds.filter((x) => !used.has(String(x))) },
      });
    }
    moved += docs.length;
    options.log?.(`${moved} records moved back to the main database`);
  }
  await Form.updateMany(
    { _id: { $in: structure.forms.map((x) => x._id) } },
    { $unset: { storage: 1 } }
  );
  invalidateStorageRegistry();
  // The database may be shared with other structures
  if ((await stored.estimatedDocumentCount()) === 0) {
    await stored.collection.drop().catch(() => undefined);
    await storedVersion.collection.drop().catch(() => undefined);
  }
  return moved;
};

/**
 * Describes every structure with a storage database.
 *
 * @returns One line per structure
 */
export const getStorageStatus = async (): Promise<
  {
    id: string;
    name: string;
    storage: string;
    records: number;
    stubs: number;
    strays: number;
  }[]
> =>
  Promise.all(
    (await getStorageStructures()).map(async (structure) => ({
      id: String(structure.id),
      name: structure.name,
      storage: structure.storage,
      records: structure.storage
        ? await getRecordModel(structure.storage).countDocuments(
            structure.filter
          )
        : 0,
      stubs: await Record.countDocuments({
        ...structure.filter,
        storage: { $exists: true },
      }),
      strays: await Record.countDocuments({
        ...structure.filter,
        storage: { $exists: false },
      }),
    }))
  );
