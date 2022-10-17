import { getFields } from '../../introspection/getFields';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import { Form, Record, ReferenceData, User, Version } from '../../../../models';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter, { extractFilterFields } from '../Query/getFilter';
import getSortField from '../Query/getSortField';
import { defaultRecordFieldsFlat } from '../../../../const/defaultRecordFields';
import extendAbilityForRecords from '../../../../security/extendAbilityForRecords';
import { GraphQLID, GraphQLList } from 'graphql';
import getDisplayText from '../../../form/getDisplayText';
import { NameExtension } from '../../introspection/getFieldName';
import getReferenceDataResolver from './getReferenceDataResolver';
import get from 'lodash/get';
import mongoose from 'mongoose';
import {
  createdByLookup,
  formLookup,
  getResourcesFilter,
  getReferenceFilter,
} from '../Query/getLookup';
import getUserFilter from '../Query/getUserFilter';
import { logger } from '../../../../services/logger.service';
import getSortAggregation from '../Query/getSortAggregation';
import buildReferenceDataAggregation from '../../../aggregation/buildReferenceDataAggregation';

/** Default number for items to get */
const DEFAULT_FIRST = 25;

/**
 * Gets the resolvers for each field of the document for a given resource
 *
 * @param name Name of the resource
 * @param data Resource fields by name
 * @param id Resource id
 * @param ids Resource ids by name
 * @param referenceDatas list of available ref data
 * @returns A object with all the resolvers
 */
export const getEntityResolver = (
  name: string,
  data,
  id: string,
  ids,
  referenceDatas: ReferenceData[]
) => {
  const fields = getFields(data[name]);

  const entityFields = Object.keys(fields);

  const relationshipFields = Object.keys(fields)
    .filter(
      (x: any) =>
        fields[x].type === GraphQLID ||
        fields[x].type.toString() === GraphQLList(GraphQLID).toString()
    )
    .filter(isRelationshipField);

  const manyToOneResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.resource))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.substr(0, fieldName.length - 3)
      );
      const relatedResource = Object.keys(ids).find(
        (x) => ids[x] == field.resource
      );
      if (field.relatedName && relatedResource) {
        return Object.assign({}, resolvers, {
          [field.name]: (entity) => {
            const recordId = get(
              entity.data,
              fieldName.substr(0, fieldName.length - 3),
              null
            );
            return recordId
              ? Record.findOne({ _id: recordId, archived: { $ne: true } })
              : null;
          },
        });
      }
    }, {});

  const manyToManyResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.resources))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.substr(0, fieldName.length - 4)
      );
      const relatedResource = Object.keys(ids).find(
        (x) => ids[x] == field.resource
      );
      if (field.relatedName && relatedResource) {
        const relatedFields =
          data[Object.keys(ids).find((x) => ids[x] == field.resource)];
        return Object.assign({}, resolvers, {
          [field.name]: async (
            entity,
            args = {
              sortField: null,
              sortOrder: 'asc',
              filter: {},
              first: DEFAULT_FIRST,
              skip: 0,
            }
          ) => {
            // Filter from the query definition
            const mongooseFilter = args.filter
              ? getFilter(args.filter, relatedFields)
              : {};

            // Additional filter on user objects such as CreatedBy or LastUpdatedBy
            // Must be applied after users lookups in the aggregation
            const userFilter = args.filter
              ? getUserFilter(args.filter, relatedFields, [])
              : {};

            const usedFields = !!args.filter
              ? extractFilterFields(args.filter)
              : [];

            if (args.sortField) {
              usedFields.push(args.sortField);
            }

            // Get resources aggregation query
            const linkedRecordsAggregation = getResourcesFilter(
              usedFields,
              relatedFields
            );

            // Get reference aggregation query
            const linkedReferenceDataAggregation: any =
              await getReferenceFilter(usedFields, relatedFields);

            try {
              let recordIds = get(
                entity.data,
                fieldName.substr(0, fieldName.length - 4),
                []
              )?.filter((x: any) => x && typeof x === 'string');
              if (recordIds) {
                recordIds = recordIds.map((x) => mongoose.Types.ObjectId(x));
                Object.assign(
                  mongooseFilter,
                  { _id: { $in: recordIds } },
                  { archived: { $ne: true } }
                );

                const filters = { $and: [mongooseFilter, userFilter] };

                return await Record.aggregate([
                  ...linkedReferenceDataAggregation,
                  ...linkedRecordsAggregation,
                  ...createdByLookup,
                  ...formLookup,
                  ...(await getSortAggregation(
                    args.sortField,
                    args.sortOrder,
                    relatedFields,
                    []
                  )),
                  { $match: filters },
                  /* {
                    $facet: {
                      items: [{ $skip: args.skip }, { $limit: args.first + 1 }],
                      totalCount: [
                        {
                          $count: 'count',
                        },
                      ],
                    },
                  }, */
                ]);
              } else {
                return null;
              }
            } catch (err) {
              logger.error(err);
              return null;
            }
          },
        });
      }
    }, {});

  const classicResolvers = entityFields
    .filter((x) => !defaultRecordFieldsFlat.includes(x))
    .reduce(
      (resolvers, fieldName) =>
        Object.assign({}, resolvers, {
          [fieldName]: (entity, args, context) => {
            const field = fields[fieldName];
            const path = relationshipFields.includes(fieldName)
              ? fieldName.substr(
                  0,
                  fieldName.length -
                    (fieldName.endsWith(NameExtension.resource) ? 3 : 4)
                )
              : fieldName;
            let value = get(entity.data, path, null);
            // Removes duplicated values
            if (Array.isArray(value)) {
              value = [...new Set(value)];
            }
            if (
              context.display &&
              (args.display === undefined || args.display)
            ) {
              const formField = data[name].find((x) => x.name === fieldName);
              if (formField && (formField.choices || formField.choicesByUrl)) {
                return getDisplayText(formField, value, context);
              }
            }
            return field.type === 'String' ? value.toString() : value;
          },
        }),
      {}
    );

  const usersResolver = {
    createdBy: (entity) => {
      if (get(entity, 'createdBy.user', null)) {
        return User.findById(entity.createdBy.user);
      }
    },
    lastUpdatedBy: async (entity) => {
      if (get(entity, 'versions', []).length > 0) {
        const lastVersion = await Version.findById(entity.versions.pop());
        return User.findById(lastVersion.createdBy);
      }
      if (get(entity, 'createdBy.user', null)) {
        return User.findById(entity.createdBy.user);
      } else {
        return null;
      }
    },
  };

  const canUpdateResolver = {
    canUpdate: async (entity, args, context) => {
      const user = context.user;
      const form = await Form.findById(
        entity.form,
        'permissions fields resource'
      );
      const ability = await extendAbilityForRecords(user, form);
      return ability.can('update', new Record(entity));
    },
  };

  const canDeleteResolver = {
    canDelete: async (entity, args, context) => {
      const user = context.user;
      const form = await Form.findById(
        entity.form,
        'permissions fields resource'
      );
      const ability = await extendAbilityForRecords(user, form);
      return ability.can('delete', new Record(entity));
    },
  };

  const entities = Object.keys(data);
  // to prevent duplication. First we try to push relations of the
  const mappedRelatedFields = [];
  const oneToManyResolvers = entities.reduce(
    // tslint:disable-next-line: no-shadowed-variable
    (resolvers, entityName) =>
      Object.assign(
        {},
        resolvers,
        Object.fromEntries(
          getReversedFields(data[entityName], id)
            .filter((x) => !mappedRelatedFields.includes(x.relatedName))
            .map((x) => {
              mappedRelatedFields.push(x.relatedName);
              return [
                x.relatedName,
                async (
                  entity,
                  args = { sortField: null, sortOrder: 'asc', filter: {} }
                ) => {
                  const mongooseFilter = args.filter
                    ? getFilter(args.filter, data[entityName])
                    : {};

                  // Additional filter on user objects such as CreatedBy or LastUpdatedBy
                  // Must be applied after users lookups in the aggregation
                  const userFilter = args.filter
                    ? getUserFilter(args.filter, data[entityName], [])
                    : {};

                  const usedFields = !!args.filter
                    ? extractFilterFields(args.filter)
                    : [];

                  if (args.sortField) {
                    usedFields.push(args.sortField);
                  }

                  // Get resources aggregation query
                  const linkedRecordsAggregation = getResourcesFilter(
                    usedFields,
                    data[entityName]
                  );

                  // Get reference aggregation query
                  const linkedReferenceDataAggregation: any =
                    await getReferenceFilter(usedFields, data[entityName]);

                  Object.assign(
                    mongooseFilter,
                    {
                      $or: [
                        { resource: ids[entityName] },
                        { form: ids[entityName] },
                      ],
                    },
                    { archived: { $ne: true } }
                  );

                  mongooseFilter[`data.${x.name}`] = entity.id.toString();
                  const filters = { $and: [mongooseFilter, userFilter] };

                  return await Record.aggregate([
                    ...linkedReferenceDataAggregation,
                    ...linkedRecordsAggregation,
                    ...createdByLookup,
                    ...formLookup,
                    ...(await getSortAggregation(
                      args.sortField,
                      args.sortOrder,
                      data[entityName],
                      []
                    )),
                    { $match: filters },
                    /* {
                      $facet: {
                        items: [{ $skip: args.skip }, { $limit: args.first + 1 }],
                        totalCount: [
                          {
                            $count: 'count',
                          },
                        ],
                      },
                    }, */
                  ]);
                },
              ];
            })
        )
      ),
    {}
  );

  /** Resolver of Reference Data. */
  const referenceDataResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.referenceData))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.substr(0, fieldName.length - 4)
      );
      const referenceData = referenceDatas.find(
        (x: any) => x._id == field.referenceData.id
      );
      if (referenceData) {
        return Object.assign(resolvers, {
          [field.name]: getReferenceDataResolver(field, referenceData),
        });
      }
    }, {});

  /** Resolver of form field. */
  const formResolver = {
    form: (entity, args, context) => {
      if (context.display && (args.display === undefined || args.display)) {
        return entity.form.name;
      } else {
        return entity.form._id;
      }
    },
  };

  return Object.assign(
    {},
    classicResolvers,
    usersResolver,
    canUpdateResolver,
    canDeleteResolver,
    manyToOneResolvers,
    manyToManyResolvers,
    oneToManyResolvers,
    referenceDataResolvers,
    formResolver
  );
};
