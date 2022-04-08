import { getFields } from '../../introspection/getFields';
import { isRelationshipField } from '../../introspection/isRelationshipField';
import { Form, Record, User, Version } from '../../../../models';
import getReversedFields from '../../introspection/getReversedFields';
import getFilter from '../Query/getFilter';
import getSortField from '../Query/getSortField';
import { defaultRecordFieldsFlat } from '../../../../const/defaultRecordFields';
import { getFormPermissionFilter } from '../../../filter';
import { AppAbility } from '../../../../security/defineAbilityFor';
import { GraphQLID, GraphQLList } from 'graphql';
import getDisplayText from '../../../form/getDisplayText';

export const getEntityResolver = (name: string, data, id: string, ids) => {
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
    .filter((fieldName) => fieldName.endsWith('_id'))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.substr(0, fieldName.length - 3)
      );
      if (field.relatedName) {
        return Object.assign({}, resolvers, {
          [field.name]: (entity) => {
            const recordId =
              entity.data[fieldName.substr(0, fieldName.length - 3)];
            return recordId
              ? Record.findOne({ _id: recordId, archived: { $ne: true } })
              : null;
          },
        });
      }
    }, {});

  const manyToManyResolvers = relationshipFields
    .filter((fieldName) => fieldName.endsWith('_ids'))
    .reduce((resolvers, fieldName) => {
      const field = data[name].find(
        (x) => x.name === fieldName.substr(0, fieldName.length - 4)
      );
      if (field.relatedName) {
        const relatedFields =
          data[Object.keys(ids).find((x) => ids[x] == field.resource)];
        return Object.assign({}, resolvers, {
          [field.name]: (
            entity,
            args = { sortField: null, sortOrder: 'asc', filter: {} }
          ) => {
            const mongooseFilter = args.filter
              ? getFilter(args.filter, relatedFields)
              : {};
            const recordIds =
              entity.data[fieldName.substr(0, fieldName.length - 4)];
            Object.assign(
              mongooseFilter,
              { _id: { $in: recordIds } },
              { archived: { $ne: true } }
            );
            return Record.find(mongooseFilter).sort([
              [getSortField(args.sortField), args.sortOrder],
            ]);
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
            const value = relationshipFields.includes(fieldName)
              ? entity.data[
                  fieldName.substr(
                    0,
                    fieldName.length - (fieldName.endsWith('_id') ? 3 : 4)
                  )
                ]
              : entity.data[fieldName];
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

  const originFormNameResolver = {
    originFormName: async (entity) => {
      let form = await Form.findById(entity.form);
      return form.name;
    },
  };

  const usersResolver = {
    createdBy: (entity) => {
      if (entity.createdBy && entity.createdBy.user) {
        return User.findById(entity.createdBy.user);
      }
    },
    lastUpdatedBy: async (entity) => {
      if (entity.versions && entity.versions.length > 0) {
        const lastVersion = await Version.findById(entity.versions.pop());
        return User.findById(lastVersion.createdBy);
      }
      if (entity.createdBy && entity.createdBy.user) {
        return User.findById(entity.createdBy.user);
      } else {
        return null;
      }
    },
  };

  const canUpdateResolver = {
    canUpdate: async (entity, args, context) => {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (ability.can('update', entity)) {
        return true;
      } else {
        const form = await Form.findById(entity.form);
        const permissionFilters = getFormPermissionFilter(
          user,
          form,
          'canUpdateRecords'
        );
        return permissionFilters.length > 0
          ? Record.exists({
              $and: [{ _id: entity.id }, { $or: permissionFilters }],
            })
          : !form.permissions.canUpdateRecords.length;
      }
    },
  };

  const canDeleteResolver = {
    canDelete: async (entity, args, context) => {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (ability.can('delete', entity)) {
        return true;
      } else {
        const form = await Form.findById(entity.form);
        const permissionFilters = getFormPermissionFilter(
          user,
          form,
          'canDeleteRecords'
        );
        return permissionFilters.length > 0
          ? Record.exists({
              $and: [{ _id: entity.id }, { $or: permissionFilters }],
            })
          : !form.permissions.canDeleteRecords.length;
      }
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
                (
                  entity,
                  args = { sortField: null, sortOrder: 'asc', filter: {} }
                ) => {
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
                  mongooseFilter[`data.${x.name}`] = entity.id;
                  return Record.find(mongooseFilter).sort([
                    [getSortField(args.sortField), args.sortOrder],
                  ]);
                },
              ];
            })
        )
      ),
    {}
  );

  return Object.assign(
    {},
    classicResolvers,
    originFormNameResolver,
    usersResolver,
    canUpdateResolver,
    canDeleteResolver,
    manyToOneResolvers,
    manyToManyResolvers,
    oneToManyResolvers
  );
};
