import { Record } from '@models';
import { Types } from 'mongoose';

/**
 * Fields of the stubs: what the main database keeps about a record stored in
 * a storage database. The stub locates the record (its id and storage) and
 * keeps the metadata used by the queries that span resources. It never holds
 * the data of the record, nor the snapshots of its form and users.
 *
 * Database users with access to the main database see these fields, so
 * trimming this list is the way to expose less about the records.
 */
export const STUB_FIELDS = [
  '_id',
  'resource',
  'form',
  'incrementalId',
  'archived',
  'draft',
  'createdAt',
  'modifiedAt',
  'versions',
  'createdBy',
  'storage',
];

/**
 * Gets the id of a value that may be populated.
 *
 * @param value Id, or populated document
 * @returns The id
 */
const toId = (value: any) =>
  value && typeof value === 'object' && '_id' in value ? value._id : value;

/**
 * Builds the stub of a record stored in a storage database.
 *
 * @param record Record, as a document or a plain object
 * @returns Stub to store in the main database
 */
export const toStub = (record: any): any => {
  const source =
    typeof record.toObject === 'function'
      ? record.toObject({ depopulate: true, virtuals: false })
      : record;
  if (!source.storage) {
    throw new Error(`Record ${source._id} has no storage`);
  }
  const stub: any = {};
  for (const field of STUB_FIELDS) {
    if (source[field] !== undefined) {
      stub[field] = source[field];
    }
  }
  stub.resource = toId(stub.resource);
  stub.form = toId(stub.form);
  if (stub.createdBy?.user) {
    stub.createdBy = { ...stub.createdBy, user: toId(stub.createdBy.user) };
  }
  return stub;
};

/**
 * Checks whether a document of the main database is a stub.
 *
 * @param record Document of the main records collection
 * @returns Whether the record is stored in a storage database
 */
export const isStub = (record: any): boolean =>
  !!record?.storage && record.data === undefined;

/**
 * Creates or refreshes the stubs of records stored in storage databases.
 * Stubs are written directly in the collection: they do not go through the
 * schema validation, as they have no data.
 *
 * @param records Records, as documents or plain objects (with their storage)
 */
export const syncStubs = async (records: any[]): Promise<void> => {
  const stubs = records.filter((x) => x?.storage).map(toStub);
  if (!stubs.length) {
    return;
  }
  await Record.collection.bulkWrite(
    stubs.map((stub) => ({
      replaceOne: {
        filter: { _id: stub._id },
        replacement: stub,
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

/**
 * Creates or refreshes the stub of a record stored in a storage database.
 *
 * @param record Record, as a document or a plain object (with its storage)
 */
export const syncStub = async (record: any): Promise<void> =>
  syncStubs([record]);

/**
 * Deletes the stubs of records.
 *
 * @param ids Ids of the records
 */
export const deleteStubs = async (
  ids: (Types.ObjectId | string)[]
): Promise<void> => {
  if (!ids.length) {
    return;
  }
  await Record.collection.deleteMany({
    _id: { $in: ids.map((id) => new Types.ObjectId(String(id))) },
    storage: { $exists: true },
  });
};
