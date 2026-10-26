import {
  Form,
  Record,
  RecordModel,
  Resource,
  VersionModel,
  getRecordModel,
  getVersionModel,
} from '@models';
import { logger } from '@services/logger.service';
import { groupBy } from 'lodash';
import mongoose, { FilterQuery, PopulateOptions, Types } from 'mongoose';
import { ensureStorageRegistry, getStorage, getStorages } from './registry';
import { STUB_FIELDS, deleteStubs, syncStubs } from './stubs';

/** Populate options: a path, or populate options, or several of them */
export type RecordPopulate =
  | PopulateOptions
  | string
  | (PopulateOptions | string)[];

/** Options of the record queries */
export interface RecordQueryOptions {
  populate?: RecordPopulate;
  select?: any;
  sort?: any;
  limit?: number;
  lean?: boolean;
}

/** Anything a record can be identified from: a document, or a plain object */
type RecordLike = { _id?: any; storage?: string };

/**
 * Gets the record model of a structure.
 *
 * @param structure Resource or form, or id of the resource, of one of its forms, or of a standalone form
 * @returns Record model of the structure
 */
export const getRecordModelForResource = async (
  structure?: Resource | Form | Types.ObjectId | string | null
): Promise<RecordModel> => getRecordModel(await getStorage(structure));

/**
 * Gets the record model of a form: the one of its resource, or its own for
 * forms without resource.
 *
 * @param form Form, with its resource as an id or populated
 * @returns Record model of the form
 */
export const getRecordModelForForm = async (
  form: Form | { _id?: any; resource?: any }
): Promise<RecordModel> =>
  getRecordModelForResource(form?.resource ? form.resource : form?._id);

/**
 * Gets the record model a record belongs to, from its storage.
 *
 * @param record Record, as a document or a plain object
 * @param record.storage Name of the storage database of the record, if any
 * @returns Record model of the record
 */
export const getRecordModelFor = (record?: { storage?: string }): RecordModel =>
  getRecordModel(record?.storage);

/**
 * Gets the version model of the versions of a record, from its storage.
 *
 * @param record Record, as a document or a plain object
 * @param record.storage Name of the storage database of the record, if any
 * @returns Version model of the record
 */
export const getVersionModelFor = (record?: {
  storage?: string;
}): VersionModel => getVersionModel(record?.storage);

/**
 * Prepares populate options for a query of a storage database: the models
 * of the references are resolved on the main connection, as the referenced
 * collections (forms, resources, users...) live in the main database. The
 * versions of a record live in its own database.
 *
 * @param populate Populate options
 * @param storage Name of the storage database of the query
 * @returns Populate options, with their connection
 */
export const populateFromMain = (
  populate: RecordPopulate,
  storage?: string
): any => {
  if (Array.isArray(populate)) {
    return populate.map((x) => populateFromMain(x, storage));
  }
  const options: any =
    typeof populate === 'string' ? { path: populate } : { ...populate };
  if (options.populate) {
    options.populate = populateFromMain(options.populate, storage);
  }
  return {
    ...options,
    connection:
      options.path === 'versions' && storage
        ? getVersionModel(storage).db
        : mongoose.connection,
  };
};

/**
 * Applies the query options to a mongoose query.
 *
 * @param query Query to configure
 * @param options Options to apply
 * @param storage Name of the storage database of the query
 * @returns The query
 */
const applyOptions = (
  query: any,
  options: RecordQueryOptions = {},
  storage?: string
) => {
  if (options.populate) {
    query = query.populate(populateFromMain(options.populate, storage));
  }
  if (options.select) {
    query = query.select(options.select);
  }
  if (options.sort) {
    query = query.sort(options.sort);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.lean) {
    query = query.lean();
  }
  return query;
};

/**
 * Locates records from their stubs in the main database.
 *
 * @param ids Ids of the records
 * @returns Storage database by id, for the records stored in one
 */
const locateRecords = async (
  ids: (Types.ObjectId | string)[]
): Promise<Map<string, string>> => {
  const stubs: any[] = await Record.find({
    _id: { $in: ids },
    storage: { $exists: true },
  })
    .select('_id storage')
    .lean();
  return new Map(stubs.map((x) => [String(x._id), x.storage]));
};

/**
 * Finds a record by id, wherever it is stored. The filter is applied on the
 * collection holding the record: it can use the data of the record.
 *
 * @param id Id of the record
 * @param filter Additional filter the record must match
 * @param options Query options
 * @returns The record, or null if not found
 */
export const findRecordById = async (
  id: Types.ObjectId | string,
  filter: FilterQuery<Record> = {},
  options: RecordQueryOptions = {}
): Promise<Record | null> => {
  if (!Types.ObjectId.isValid(String(id))) {
    return null;
  }
  const located = await locateRecords([id]);
  const storage = located.get(String(id));
  const query = { $and: [{ _id: id }, filter] };
  if (storage) {
    return applyOptions(
      getRecordModel(storage).findOne(query),
      options,
      storage
    );
  }
  const record = await applyOptions(Record.findOne(query), options);
  if (record || !getStorages().length) {
    return record;
  }
  // No stub: the record may still be in a storage database, if its stub was
  // lost. Rare enough to afford a lookup per storage database
  for (const other of getStorages()) {
    const found = await applyOptions(
      getRecordModel(other).findOne(query),
      options,
      other
    );
    if (found) {
      logger.warn(`Record ${id} found in storage ${other} without stub`);
      return found;
    }
  }
  return null;
};

/**
 * Finds records by ids, wherever they are stored. The filter is applied on
 * the collections holding the records: it can use the data of the records.
 * The records are not returned in the order of the ids.
 *
 * @param ids Ids of the records
 * @param filter Additional filter the records must match
 * @param options Query options
 * @returns The records found
 */
export const findRecordsByIds = async (
  ids: (Types.ObjectId | string)[],
  filter: FilterQuery<Record> = {},
  options: RecordQueryOptions = {}
): Promise<Record[]> => {
  const validIds = ids.filter((id) => Types.ObjectId.isValid(String(id)));
  if (!validIds.length) {
    return [];
  }
  const located = await locateRecords(validIds);
  const byStorage = groupBy(validIds, (id) => located.get(String(id)) ?? '');
  const results = await Promise.all(
    Object.entries(byStorage).map(([storage, storageIds]) =>
      applyOptions(
        getRecordModel(storage || undefined).find({
          $and: [{ _id: { $in: storageIds } }, filter],
        }),
        options,
        storage || undefined
      )
    )
  );
  return results.flat();
};

/**
 * Finds records matching a filter in every database: the main one (without
 * the stubs) and the storage ones.
 *
 * @param filter Filter the records must match
 * @param options Query options, applied to each database
 * @returns The records found
 */
export const findRecordsAcrossStorages = async (
  filter: FilterQuery<Record> = {},
  options: RecordQueryOptions = {}
): Promise<Record[]> => {
  await ensureStorageRegistry();
  const queries = [
    applyOptions(
      Record.find({ $and: [filter, { storage: { $exists: false } }] }),
      options
    ),
    ...getStorages().map((storage) =>
      applyOptions(getRecordModel(storage).find(filter), options, storage)
    ),
  ];
  const results = await Promise.all(queries);
  return results.flat();
};

/**
 * Saves a record document, and its stub when stored in a storage database.
 *
 * @param record Record document, from the model of its storage
 * @returns The saved record
 */
export const saveRecord = async <T extends Record>(record: T): Promise<T> => {
  await record.save();
  if (record.storage) {
    await syncStubs([record]);
  }
  return record;
};

/**
 * Inserts records with a model, and their stubs when the model is the one of
 * a storage database.
 *
 * @param model Record model to insert with
 * @param records Records to insert
 * @returns The inserted records
 */
export const insertRecords = async (
  model: RecordModel,
  records: Record[]
): Promise<Record[]> => {
  const inserted = await model.insertMany(records);
  await syncStubs(inserted);
  return inserted;
};

/**
 * Updates a record by id, in its database, and its stub when stored in a
 * storage database.
 *
 * @param record Record to update, as a document or a plain object
 * @param update Update to apply
 * @returns The updated record
 */
export const updateRecordById = async (
  record: RecordLike,
  update: any
): Promise<Record | null> => {
  const updated = await getRecordModelFor(record).findByIdAndUpdate(
    record._id,
    update,
    { new: true }
  );
  if (updated?.storage) {
    await syncStubs([updated]);
  }
  return updated;
};

/**
 * Updates records, each in its database, and their stubs when stored in
 * storage databases.
 *
 * @param records Records to update, as documents or plain objects
 * @param update Update to apply
 * @returns Number of modified records
 */
export const updateRecords = async (
  records: RecordLike[],
  update: any
): Promise<number> => {
  let modified = 0;
  for (const [storage, group] of Object.entries(
    groupBy(records, (x) => x.storage ?? '')
  )) {
    const model = getRecordModel(storage || undefined);
    const ids = group.map((x) => x._id);
    const result = await model.updateMany({ _id: { $in: ids } }, update);
    modified += result.modifiedCount;
    if (storage) {
      const updated = await model
        .find({ _id: { $in: ids } })
        .select(STUB_FIELDS.join(' '))
        .lean();
      await syncStubs(updated);
    }
  }
  return modified;
};

/**
 * Deletes a record by id, from its database, and its stub when stored in a
 * storage database. The versions of the record are deleted by the model.
 *
 * @param record Record to delete, as a document or a plain object
 * @returns The deleted record
 */
export const deleteRecordById = async (
  record: RecordLike
): Promise<Record | null> => {
  const deleted = await getRecordModelFor(record).findByIdAndDelete(record._id);
  if (record.storage) {
    await deleteStubs([record._id]);
  }
  return deleted;
};

/**
 * Deletes records, each from its database, and their stubs when stored in
 * storage databases. The versions of the records are deleted by the models.
 *
 * @param records Records to delete, as documents or plain objects
 * @returns Number of deleted records
 */
export const deleteRecords = async (records: RecordLike[]): Promise<number> => {
  let deleted = 0;
  for (const [storage, group] of Object.entries(
    groupBy(records, (x) => x.storage ?? '')
  )) {
    const ids = group.map((x) => x._id);
    const result = await getRecordModel(storage || undefined).deleteMany({
      _id: { $in: ids },
    });
    deleted += result.deletedCount;
    if (storage) {
      await deleteStubs(ids);
    }
  }
  return deleted;
};
