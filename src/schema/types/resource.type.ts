import { accessibleBy } from '@casl/mongoose';
import { Form, Record } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForRecords, {
  userHasRoleFor,
} from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { getMetaData } from '@utils/form/metadata.helper';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
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
import { pluralize } from 'inflection';
import { get, indexOf } from 'lodash';
import {
  AccessType,
  AggregationConnectionType,
  FieldMetaDataType,
  FormType,
  LayoutConnectionType,
  RecordConnectionType,
} from '.';
import { resourcePermission } from '../../types/permission';
import { Connection, decodeCursor, encodeCursor } from './pagination.type';

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
  // Check if one rule exists where no access filter is set
  const full =
    indexOf(
      rules.map((x) => x.access !== undefined),
      false
    ) !== -1;
  return rules.length > 0
    ? {
        role,
        access: {
          logic: 'or',
          filters: rules.map((x) => x.access).filter((x) => x), // remove null values
        },
        full,
      }
    : null;
};

/** Default page size */
const DEFAULT_FIRST = 10;

/** GraphQL Resource type definition */
export const ResourceType = new GraphQLObjectType({
  name: 'Resource',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    singleQueryName: {
      type: GraphQLString,
      resolve(parent) {
        return Form.getGraphQLTypeName(parent.name);
      },
    },
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
              resourcePermission.CREATE_RECORDS,
              parent.permissions,
              args.role
            ),
            canSeeRecords: rolePermissionResolver(
              resourcePermission.SEE_RECORDS,
              parent.permissions,
              args.role
            ),
            canUpdateRecords: rolePermissionResolver(
              resourcePermission.UPDATE_RECORDS,
              parent.permissions,
              args.role
            ),
            canDeleteRecords: rolePermissionResolver(
              resourcePermission.DELETE_RECORDS,
              parent.permissions,
              args.role
            ),
            canDownloadRecords: rolePermissionResolver(
              resourcePermission.DOWNLOAD_RECORDS,
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
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const forms = await Form.find({
          resource: parent.id,
          ...accessibleBy(ability, 'read').Form,
        });
        return forms;
      },
    },
    relatedForms: {
      type: new GraphQLList(FormType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const forms = await Form.find({
          status: 'active',
          'fields.resource': parent.id,
          ...accessibleBy(ability, 'read').Form,
        });
        return forms;
      },
    },
    coreForm: {
      type: FormType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const form = await Form.findOne({
          resource: parent.id,
          core: true,
          ...accessibleBy(ability, 'read').Form,
        });
        return form;
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
            ...getFilter(args.filter, parent.fields, {
              ...context,
              resourceFieldsById: {
                [parent.id]: parent.fields,
              },
            }),
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
        const permissionFilters = Record.find(
          accessibleBy(ability, 'read').Record
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
          node: Object.assign(
            getAccessibleFields(r, ability).toObject({ minimize: false }),
            { id: r._id }
          ),
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
        const count = await Record.find({
          resource: parent.id,
          archived: { $ne: true },
          ...accessibleBy(ability, 'read').Record,
        }).count();
        return count;
      },
    },
    fields: { type: GraphQLJSON },
    canCreateRecords: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        // either check that user can manage records, either check that user has a role to create records
        return (
          ability.can('manage', 'Record') ||
          userHasRoleFor(
            resourcePermission.CREATE_RECORDS,
            context.user,
            parent
          )
        );
      },
    },
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
    canDownloadRecords: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        // either check that user can manage records, either check that user has a role to create records
        return (
          ability.can('manage', 'Record') ||
          userHasRoleFor(
            resourcePermission.DOWNLOAD_RECORDS,
            context.user,
            parent
          )
        );
      },
    },
    layouts: {
      type: LayoutConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        ids: { type: new GraphQLList(GraphQLID) },
      },
      resolve(parent, args) {
        let start = 0;
        const first = args.first || DEFAULT_FIRST;
        let allEdges = parent.layouts.map((x) => ({
          cursor: encodeCursor(x.id.toString()),
          node: x,
        }));
        if (args.ids && args.ids.length > 0) {
          allEdges = allEdges.filter((x) => args.ids.includes(x.node.id));
        }
        const totalCount = allEdges.length;
        if (args.afterCursor) {
          start = allEdges.findIndex((x) => x.cursor === args.afterCursor) + 1;
        }
        let edges = allEdges.slice(start, start + first + 1);
        const hasNextPage = edges.length > first;
        if (hasNextPage) {
          edges = edges.slice(0, edges.length - 1);
        }
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount,
        };
      },
    },
    aggregations: {
      type: AggregationConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        ids: { type: new GraphQLList(GraphQLID) },
      },
      resolve(parent, args) {
        let start = 0;
        const first = args.first || DEFAULT_FIRST;
        let allEdges = parent.aggregations.map((x) => ({
          cursor: encodeCursor(x.id.toString()),
          node: x,
        }));
        if (args.ids && args.ids.length > 0) {
          allEdges = allEdges.filter((x) => args.ids.includes(x.node.id));
        }
        const totalCount = allEdges.length;
        if (args.afterCursor) {
          start = allEdges.findIndex((x) => x.cursor === args.afterCursor) + 1;
        }
        let edges = allEdges.slice(start, start + first + 1);
        const hasNextPage = edges.length > first;
        if (hasNextPage) {
          edges = edges.slice(0, edges.length - 1);
        }
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount,
        };
      },
    },
    metadata: {
      type: new GraphQLList(FieldMetaDataType),
      resolve(parent, _, context) {
        return getMetaData(parent, context);
      },
    },
  }),
});

/** GraphQL resource connection type definition */
export const ResourceConnectionType = Connection(ResourceType);
