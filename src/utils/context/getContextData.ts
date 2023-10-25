import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { Types } from 'mongoose';
import { Record, Resource, User } from '@models';
import { accessibleBy } from '@casl/mongoose';

/** Maximum recursion depth for getting the context data */
const MAX_DEPTH = 10;

/**
 * Get the context data for a record, recursively.
 *
 * @param resourceID Resource ID or Resource the record belongs to
 * @param recordID Record to get the context data from
 * @param user User to check permissions
 * @param context graphql context
 * @param depth Current depth of the recursion
 * @returns Context data
 */
export const getContextData = async (
  resourceID: Types.ObjectId | Resource,
  recordID: Types.ObjectId | Record,
  user: User,
  context: any,
  depth = 0
) => {
  const resource =
    resourceID instanceof Resource
      ? resourceID
      : await Resource.findById(resourceID);

  const record = (
    recordID instanceof Record ? recordID : await Record.findById(recordID)
  ) as Record;

  if (!resource || depth > MAX_DEPTH || !record.data) return record.data ?? {};

  const fields = resource.fields;
  const data: { [key: string]: any } = {};
  for (const field of fields) {
    const ability = await extendAbilityForRecords(user);
    if (field.type === 'resource') {
      const refRecordID = record.data[field.name];
      const refRecord = getAccessibleFields(
        await Record.findById(refRecordID),
        ability
      );

      // if related record is not found, skip this field
      if (!refRecord) continue;

      // if related record is found, get its data
      const refRecordData = await getContextData(
        field.resource,
        refRecord,
        user,
        depth + 1
      );

      // concat the field names of the related record with the current field name
      const refRecordDataWithFieldNames = Object.keys(refRecordData).reduce(
        (acc2, key) => {
          acc2[`${field.name}.${key}`] = refRecordData[key];
          return acc2;
        },
        {} as { [key: string]: any }
      );

      Object.assign(data, {
        ...refRecordDataWithFieldNames,
        [field.name]: record.data[field.name],
      });
    } else if (field.isCalculated) {
      // Check abilities
      const permissionFilters = Record.find(
        accessibleBy(ability, 'read')
      ).getFilter();

      const pipeline = [
        // Match the record and the permission filters
        {
          $match: {
            $and: [
              {
                _id: record._id,
              },
              permissionFilters,
            ],
          },
        },
        // Stages for calculating the field
        ...buildCalculatedFieldPipeline(
          field.expression,
          field.name,
          context.timeZone
        ),
      ];

      const result = await Record.aggregate(pipeline);
      const calculatedValue = result[0]?.data?.[field.name];
      if (calculatedValue) {
        Object.assign(data, { [field.name]: calculatedValue });
      }
    } else {
      Object.assign(data, { [field.name]: record.data[field.name] });
    }
  }

  return data;
};
