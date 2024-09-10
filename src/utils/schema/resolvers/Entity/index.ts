import { getFields } from '../../introspection/getFields';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import { Record, ReferenceData, User } from '@models';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter from '../Query/getFilter';
import getSortField from '../Query/getSortField';
import { defaultRecordFieldsFlat } from '@const/defaultRecordFields';
import { GraphQLID, GraphQLList } from 'graphql';
import getDisplayText from '../../../form/getDisplayText';
import { NameExtension } from '../../introspection/getFieldName';
import getReferenceDataResolver from './getReferenceDataResolver';
import get from 'lodash/get';
import { logger } from '@lib/logger';
import { subject } from '@casl/ability';
import { SortOrder } from 'mongoose';

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
        fields[x].type.toString() === new GraphQLList(GraphQLID).toString()
    )
    .filter(isRelationshipField);

  const manyToOneResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.resource))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find((x) => x.name === fieldName.slice(0, -3));
      const relatedResource = Object.keys(ids).find(
        (x) => ids[x] == field.resource
      );
      if (field.relatedName && relatedResource) {
        return Object.assign({}, resolvers, {
          [field.name]: async (entity) => {
            // Get from aggregation
            if (entity._relatedRecords && entity._relatedRecords[field.name]) {
              return entity._relatedRecords[field.name];
            }
            // Else, do db query
            const recordId = get(entity.data, fieldName.slice(0, -3), null);
            const record = recordId
              ? await Record.findOne({ _id: recordId, archived: { $ne: true } })
              : null;
            return record;
          },
        });
      }
    }, {});

  const manyToManyResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith(NameExtension.resources))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find((x) => x.name === fieldName.slice(0, -4));
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
              sortOrder: 'asc' as SortOrder,
              filter: {},
              first: null,
            }
          ) => {
            // Get from aggregation
            if (entity._relatedRecords && entity._relatedRecords[field.name]) {
              let records = entity._relatedRecords[field.name];
              if (args.first !== null) {
                records = records.slice(0, args.first);
              }
              return records;
            }
            // Else, do db query
            const mongooseFilter = args.filter
              ? getFilter(args.filter, relatedFields)
              : {};
            try {
              const recordIds = get(
                entity.data,
                fieldName.slice(0, -4),
                []
              )?.filter((x: any) => x && typeof x === 'string');
              if (recordIds) {
                Object.assign(
                  mongooseFilter,
                  { _id: { $in: recordIds } },
                  { archived: { $ne: true } }
                );
                return await Record.find(mongooseFilter)
                  .sort([[getSortField(args.sortField), args.sortOrder]])
                  .limit(args.first);
                // if (args.first !== null) {
                //   records = records.limit(args.first);
                // }
              } else {
                return null;
              }
            } catch (err) {
              logger.error(err.message, { stack: err.stack });
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
              ? fieldName.slice(
                  0,
                  fieldName.endsWith(NameExtension.resource) ? -3 : -4
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
    createdBy: async (entity) => {
      // Get from the aggregation
      if (get(entity, '_createdBy.user', null)) return entity._createdBy.user;
      // Else, do db query
      if (get(entity, 'createdBy.user', null)) {
        const user = await User.findById(
          entity.createdBy.user,
          '_id name username'
        );
        return user;
      }
    },
    lastUpdatedBy: async (entity) => {
      // Get from the aggregation
      if (get(entity, '_lastUpdatedBy.user', null))
        return entity._lastUpdatedBy.user;
      // if (get(entity, 'versions', []).length > 0) {
      //   // Get from the aggregation
      //   if (get(entity, '_lastUpdatedBy.user', null))
      //     return entity._lastUpdatedBy.user;
      //   // Else, do db query
      //   const lastVersion = await Version.findById(entity.versions.pop());
      //   return User.findById(lastVersion.createdBy);
      // }
      // Get from the aggregation
      if (get(entity, '_createdBy.user', null)) return entity._createdBy.user;
      // Else, do db query
      if (get(entity, 'createdBy.user', null)) {
        const user = await User.findById(
          entity.createdBy.user,
          '_id name username'
        );
        return user;
      }
      // if (get(entity, 'createdBy.user', null)) {
      //   // Get from the aggregation
      //   if (get(entity, '_createdBy.user', null)) return entity._createdBy.user;
      //   // Else, do db query
      //   return User.findById(entity.createdBy.user, '_id name username');
      // } else {
      //   return null;
      // }
    },
  };

  const canUpdateResolver = {
    canUpdate: async (entity, args, context) => {
      // todo: check single resolver to have same project than in all resolver
      const ability = context.user.ability;
      return ability.can('update', subject('Record', entity));
    },
  };

  const canDeleteResolver = {
    canDelete: async (entity, args, context) => {
      // todo: check single resolver to have same project than in all resolver
      const ability = context.user.ability;
      return ability.can('delete', subject('Record', entity));
    },
  };

  const entities = Object.keys(data);
  // to prevent duplication. First we try to push relations of the
  const mappedRelatedFields = [];
  // Link with resource AND resources questions from other forms (Not really oneToMany since resourceS questions)
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
                  args = {
                    sortField: null,
                    sortOrder: 'asc' as SortOrder,
                    filter: {},
                    first: null,
                  }
                ) => {
                  // Ignore sort + filter if found from aggregation
                  if (
                    entity._relatedRecords &&
                    entity._relatedRecords[x.relatedName]
                  ) {
                    let records = entity._relatedRecords[x.relatedName];
                    if (args.first) {
                      records = records.slice(0, args.first);
                    }
                    return records;
                  }
                  // Else, do db query
                  const mongooseFilter = args.filter
                    ? getFilter(args.filter, data[entityName])
                    : {};
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
                  const records = await Record.find(mongooseFilter)
                    .sort([[getSortField(args.sortField), args.sortOrder]])
                    .limit(args.first);
                  return records;
                  // if (args.first !== null) {
                  //   records = records.limit(args.first);
                  // }
                  // return records;
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
      const field = data[name].find((x) => x.name === fieldName.slice(0, -4));
      const referenceData = referenceDatas.find(
        (x: any) => x._id == field.referenceData.id
      );
      if (referenceData) {
        return Object.assign(resolvers, {
          [field.name]: getReferenceDataResolver(field, referenceData),
        });
      } else {
        return resolvers;
      }
    }, {});

  /** Resolver of form field. */
  const formResolver = {
    form: (entity, args, context) => {
      const form = entity._form || entity.form;
      if (context.display && (args.display === undefined || args.display)) {
        return get(form, 'name', '');
      } else {
        return get(form, '_id', '');
      }
    },
  };

  /** Resolver of last update form field. */
  const lastUpdateFormResolver = {
    lastUpdateForm: (entity, args, context) => {
      const form = entity._lastUpdateForm || entity.lastUpdateForm;
      if (context.display && (args.display === undefined || args.display)) {
        return get(form, 'name', '');
      } else {
        return get(form, '_id', '');
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
    formResolver,
    lastUpdateFormResolver
  );
};
