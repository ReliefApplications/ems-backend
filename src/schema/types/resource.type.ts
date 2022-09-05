import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, FormType, RecordConnectionType, LayoutType } from '.';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import extendAbilityForRecords from '../../security/extendAbilityForRecords';
import { Connection, decodeCursor, encodeCursor } from './pagination.type';
import getFilter from '../../utils/schema/resolvers/Query/getFilter';
import { pluralize } from 'inflection';
import { getMetaData } from '../../utils/form/metadata.helper';
import { getAccessibleFields } from '../../utils/form';
import get from 'lodash/get';

/**
 * Resolve single permission
 *
 * @param name name of permission
 * @param permissions array of resource permissions
 * @param role active role
 * @returns single permission ( or null if don't exist )
 */
const rolePermissionResolver = (
  name: string,
  permissions: any[],
  role: string
) => {
  const rules = get(permissions, name, []).filter((x: any) =>
    x.role.equals(role)
  );
  return rules.length > 0
    ? {
        role,
        access: {
          logic: 'or',
          filters: rules.map((x) => x.access).filter((x) => x),
        },
      }
    : null;
};

/** GraphQL Resource type definition */
export const ResourceType = new GraphQLObjectType({
  name: 'Resource',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    queryName: {
      type: GraphQLString,
      resolve(parent) {
        return 'all' + pluralize(Form.getGraphQLTypeName(parent.name));
      },
    },
    createdAt: { type: GraphQLString },
    permissions: {
      type: AccessType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    rolePermissions: {
      type: GraphQLJSON,
      args: {
        role: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('update', parent)) {
          return {
            canCreateRecords: rolePermissionResolver(
              'canCreateRecords',
              parent.permissions,
              args.role
            ),
            canSeeRecords: rolePermissionResolver(
              'canSeeRecords',
              parent.permissions,
              args.role
            ),
            canUpdateRecords: rolePermissionResolver(
              'canUpdateRecords',
              parent.permissions,
              args.role
            ),
            canDeleteRecords: rolePermissionResolver(
              'canDeleteRecords',
              parent.permissions,
              args.role
            ),
          };
        } else {
          return null;
        }
      },
    },
    forms: {
      type: new GraphQLList(FormType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.find({ resource: parent.id }).accessibleBy(ability, 'read');
      },
    },
    relatedForms: {
      type: new GraphQLList(FormType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.find({
          status: 'active',
          'fields.resource': parent.id,
        }).accessibleBy(ability, 'read');
      },
    },
    coreForm: {
      type: FormType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Form.findOne({ resource: parent.id, core: true }).accessibleBy(
          ability,
          'read'
        );
      },
    },
    records: {
      type: RecordConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        filter: { type: GraphQLJSON },
        archived: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        let mongooseFilter: any = {
          resource: parent.id,
        };
        if (args.archived) {
          Object.assign(mongooseFilter, { archived: true });
        } else {
          Object.assign(mongooseFilter, { archived: { $ne: true } });
        }
        if (args.filter) {
          mongooseFilter = {
            ...mongooseFilter,
            ...getFilter(args.filter, parent.fields),
          };
        }
        // PAGINATION
        const cursorFilters = args.afterCursor
          ? {
              _id: {
                $gt: decodeCursor(args.afterCursor),
              },
            }
          : {};
        // Check abilities
        const ability = await extendAbilityForRecords(context.user, parent);
        // request the records
        const permissionFilters = Record.accessibleBy(
          ability,
          'read'
        ).getFilter();
        let items = await Record.find({
          $and: [cursorFilters, mongooseFilter, permissionFilters],
        }).limit(args.first + 1);
        const hasNextPage = items.length > args.first;
        if (hasNextPage) {
          items = items.slice(0, items.length - 1);
        }
        const edges = items.map((r) => ({
          cursor: encodeCursor(r.id.toString()),
          node: getAccessibleFields(r, ability),
        }));
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount: await Record.countDocuments({
            $and: [mongooseFilter, permissionFilters],
          }),
        };
      },
    },
    recordsCount: {
      type: GraphQLInt,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForRecords(context.user, parent);
        return Record.accessibleBy(ability, 'read')
          .find({ resource: parent.id, archived: { $ne: true } })
          .count();
      },
    },
    userAccessToFields: {
      type: GraphQLJSON,
      async resolve(parent, _, context) {
        const ability = await extendAbilityForRecords(context.user, parent);

        return parent.fields.reduce(
          (acc, field) =>
            Object.assign({}, acc, {
              [field.name]: {
                canSee: ability.can('read', parent, `field.${field.name}`),
                canUpdate: ability.can('update', parent, `field.${field.name}`),
              },
            }),
          {}
        );
      },
    },
    fields: { type: GraphQLJSON },
    canSee: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('read', parent);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent);
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('delete', parent);
      },
    },
    layouts: {
      type: new GraphQLList(LayoutType),
    },
    metadata: {
      type: new GraphQLList(GraphQLJSON),
      resolve(parent) {
        return getMetaData(parent);
      },
    },
  }),
});

/** GraphQL resource connection type definition */
export const ResourceConnectionType = Connection(ResourceType);
