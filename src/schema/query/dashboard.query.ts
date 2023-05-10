import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { DashboardType } from '../types';
import {
  ApiConfiguration,
  Dashboard,
  Page,
  Record,
  ReferenceData,
  Resource,
  User,
} from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { CustomAPI } from '@server/apollo/dataSources';
import { Types } from 'mongoose';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import buildCalculatedFieldPipeline from '@utils/aggregation/buildCalculatedFieldPipeline';

/** Maximum recursion depth for getting the context data */
const MAX_DEPTH = 10;

/**
 * Get the context data for a record, recursively.
 *
 * @param resourceID Resource ID or Resource the record belongs to
 * @param record Record to get the context data from
 * @param user User to check permissions
 * @param depth Current depth of the recursion
 * @returns Context data
 */
const getContextData = async (
  resourceID: Types.ObjectId | Resource,
  record: Record,
  user: User,
  depth = 0
) => {
  const resource =
    resourceID instanceof Resource
      ? resourceID
      : await Resource.findById(resourceID);

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
      const permissionFilters = Record.accessibleBy(
        ability,
        'read'
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
        ...buildCalculatedFieldPipeline(field.expression, field.name),
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
 * Return dashboard from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // get data and check permissions
    const dashboard = await Dashboard.findById(args.id);
    const ability = await extendAbilityForContent(user, dashboard);
    if (ability.cannot('read', dashboard)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    // Check if dashboard has context linked to it
    const page = await Page.findOne({
      contentWithContext: { $elemMatch: { content: args.id } },
    });

    // If a page was found, means the dashboard has context
    if (page && page.context) {
      // get the id of the resource or refData
      const contentWithContext = page.contentWithContext.find((c) =>
        (c.content as Types.ObjectId).equals(args.id)
      );
      const id =
        'element' in contentWithContext && contentWithContext.element
          ? contentWithContext.element
          : 'record' in contentWithContext && contentWithContext.record
          ? contentWithContext.record
          : null;

      const ctx = page.context;
      let data: any;

      if ('resource' in ctx && ctx.resource) {
        const record = await Record.findById(id);
        data = await getContextData(
          ctx.resource instanceof Resource ? ctx.resource.id : ctx.resource,
          record,
          context.user
        );
      } else if ('refData' in ctx && ctx.refData) {
        // get refData from page
        const referenceData = await ReferenceData.findById(ctx.refData);
        const apiConfiguration = await ApiConfiguration.findById(
          referenceData.apiConfiguration
        );
        const items = apiConfiguration
          ? await (
              context.dataSources[apiConfiguration.name] as CustomAPI
            ).getReferenceDataItems(referenceData, apiConfiguration)
          : referenceData.data;
        data = items.find((x) => x[referenceData.valueField] === id);
      }

      const stringifiedStructure = JSON.stringify(dashboard.structure);
      const regex = /{{context\.(.*?)}}/g;

      // replace all {{context.<field>}} with the value from the data
      dashboard.structure = JSON.parse(
        stringifiedStructure.replace(regex, (match) => {
          const field = match.replace('{{context.', '').replace('}}', '');
          return data[field] || match;
        })
      );
    }
    return dashboard;
  },
};
