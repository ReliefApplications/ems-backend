import { getAccessibleFields } from '@utils/form';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';
import { Types } from 'mongoose';
import {
  ApiConfiguration,
  Page,
  Record,
  ReferenceData,
  Resource,
} from '@models';
import { accessibleBy } from '@casl/mongoose';
import get from 'lodash/get';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { Context } from '@server/apollo/context';
import { CustomAPI } from '@server/apollo/dataSources';

/** Maximum recursion depth for getting the context data */
const MAX_DEPTH = 10;

/**
 * Get the context data for a record, recursively.
 *
 * @param resourceID Resource ID or Resource the record belongs to
 * @param recordID Record to get the context data from
 * @param context graphql context
 * @param depth Current depth of the recursion
 * @returns Context data
 */
export const getContextDataForRecord = async (
  resourceID: Types.ObjectId | Resource,
  recordID: Types.ObjectId | Record,
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
    if (field.type === 'resource') {
      const refRecordID = get(record.data, field.name);
      if (!refRecordID) {
        continue;
      }
      const refRecord = getAccessibleFields(
        await Record.findById(refRecordID),
        context.user.ability
      );

      // if related record is not found, skip this field
      if (!refRecord) continue;

      // if related record is found, get its data
      const refRecordData = await getContextDataForRecord(
        field.resource,
        refRecord,
        context,
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
        accessibleBy(context.user.ability, 'read').Record
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

/**
 * Gets the context data for either a record or an element id
 *
 * @param recordId id of the record to get context from
 * @param elementId id of the element to get context from
 * @param page page relative to the dashboard
 * @param context context for the user
 * @returns context data
 */
export const getContextData = async (
  recordId: Record | Types.ObjectId | null,
  elementId: any,
  page: Page,
  context: Context
) => {
  const ctx = page.context;
  try {
    if (recordId) {
      const resource = 'resource' in ctx ? ctx.resource : null;
      context.user.ability = await extendAbilityForRecords(context.user);
      const data = await getContextDataForRecord(resource, recordId, context);
      return data;
    } else if (elementId) {
      const refData = 'refData' in ctx ? ctx.refData : null;
      // get refData from page
      const referenceData = await ReferenceData.findById(refData);
      const apiConfiguration = await ApiConfiguration.findById(
        referenceData.apiConfiguration
      );
      const items = apiConfiguration
        ? await (
            context.dataSources[apiConfiguration.name] as CustomAPI
          ).getReferenceDataItems(referenceData, apiConfiguration)
        : referenceData.data;
      // Use '==' for number / string comparison
      return items.find((x) => get(x, referenceData.valueField) == elementId);
    }
    return null;
  } catch (err) {
    return null;
  }
};
