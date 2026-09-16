import { Record, Version } from '@models';
import { Types } from 'mongoose';

/**
 * Duplicate the versions of a record, so that a copy of that record owns its
 * own version documents.
 * Versions must never be shared between two records: record deletion cascades
 * into a deletion of its versions, so sharing them would destroy the history
 * of the other record.
 *
 * @param record record to copy the versions from
 * @param options additional options
 * @param options.appendCurrentData if true, append an extra version storing the
 * current data of the record, so that the history of the copy displays the
 * difference between the record and its copy
 * @param options.createdBy user to set as author of the appended version
 * @returns ids of the newly created versions, in chronological order
 */
export const copyRecordVersions = async (
  record: Record,
  options?: {
    appendCurrentData?: boolean;
    createdBy?: Types.ObjectId;
  }
): Promise<Types.ObjectId[]> => {
  const versionIds: any[] = record.versions || [];
  const documents = await Version.find({ _id: { $in: versionIds } });
  const documentById = new Map(documents.map((x: any) => [String(x._id), x]));
  // Mongo doesn't preserve $in order, so re-map to match the record's versions.
  // Versions that cannot be found are skipped, as they would break the history.
  const copies = versionIds
    .map((id) => documentById.get(String(id)))
    .filter((version) => !!version)
    .map(
      (version) =>
        new Version({
          data: version.data,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
        })
    );
  if (options?.appendCurrentData) {
    copies.push(
      new Version({
        data: record.data,
        createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
        createdBy: options.createdBy,
      })
    );
  }
  if (!copies.length) {
    return [];
  }
  await Version.insertMany(copies);
  return copies.map((version) => version._id);
};
