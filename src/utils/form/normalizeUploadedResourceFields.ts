import { Record } from '@models';
import mongoose from 'mongoose';

type ResourceField = {
  name: string;
  type: string;
  resource?: mongoose.Types.ObjectId | string;
};

type RecordData = { [key: string]: unknown };

/**
 * Checks whether a string is a canonical MongoDB ObjectId.
 *
 * @param value potential MongoDB ObjectId.
 * @returns whether the value is a canonical MongoDB ObjectId.
 */
const isMongoId = (value: string): boolean =>
  mongoose.isObjectIdOrHexString(value) &&
  new mongoose.Types.ObjectId(value).toString() === value;

/**
 * Converts uploaded resource record IDs to ObjectIds after confirming that
 * they belong to the resource configured for each relationship field.
 *
 * @param data uploaded record data.
 * @param fields fields declared on the uploaded form or resource.
 */
export const normalizeUploadedResourceFields = async (
  data: RecordData,
  fields: ResourceField[]
): Promise<void> => {
  for (const field of fields) {
    if (
      (field.type !== 'resource' && field.type !== 'resources') ||
      !Object.prototype.hasOwnProperty.call(data, field.name)
    ) {
      continue;
    }

    const value = data[field.name];
    const ids =
      field.type === 'resources' && typeof value === 'string'
        ? value.split(';').map((id) => id.trim())
        : typeof value === 'string'
        ? [value.trim()]
        : [];
    const validIds = ids.filter(isMongoId);

    if (!field.resource || validIds.length === 0) {
      delete data[field.name];
      continue;
    }

    const matchingIds = await Record.distinct('_id', {
      _id: { $in: validIds },
      resource: field.resource,
    });
    const matchingIdSet = new Set(matchingIds.map(String));
    const resourceIds = validIds
      .filter((id) => matchingIdSet.has(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (field.type === 'resource') {
      if (resourceIds.length > 0) {
        data[field.name] = resourceIds[0];
      } else {
        delete data[field.name];
      }
    } else if (resourceIds.length > 0) {
      data[field.name] = resourceIds;
    } else {
      delete data[field.name];
    }
  }
};
