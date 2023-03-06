import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInt,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  AccessType,
  ResourceType,
  RecordType,
  VersionType,
  RecordConnectionType,
  LayoutConnectionType,
  FieldMetaDataType,
} from '.';
import { Resource, Record, Version, Form } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { getFormPermissionFilter } from '@utils/filter';
import { StatusEnumType } from '@const/enumTypes';
import { Connection, decodeCursor, encodeCursor } from './pagination.type';
import getFilter from '@utils/schema/resolvers/Query/getFilter';
import { pluralize } from 'inflection';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { getMetaData } from '@utils/form/metadata.helper';
import { getAccessibleFields } from '@utils/form';

/** Default page size */
const DEFAULT_FIRST = 10;

/** GraphQL form type definition */
export const FormType = new GraphQLObjectType({
  name: 'Form',
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
    modifiedAt: { type: GraphQLString },
    structure: { type: GraphQLJSON },
    status: { type: StatusEnumType },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    resource: {
      type: ResourceType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Resource.findById(parent.resource).accessibleBy(ability, 'read');
      },
    },
    core: {
      type: GraphQLBoolean,
      resolve(parent) {
        return parent.core ? parent.core : false;
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
        const ability = await extendAbilityForRecords(context.user, parent);
        let mongooseFilter: any = {
          form: parent.id,
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
        // Filter from the user permissions
        const permissionFilters = Record.accessibleBy(
          ability,
          'read'
        ).getFilter();
        // Get data
        let items = await Record.find({
          $and: [cursorFilters, mongooseFilter, permissionFilters],
        }).limit(args.first + 1);
        const hasNextPage = items.length > args.first;
        if (hasNextPage) {
          items = items.slice(0, items.length - 1);
        }
        const edges = items.map((r) => ({
          cursor: encodeCursor(r.id.toString()),
          node: Object.assign(getAccessibleFields(r, ability).toObject(), {
            id: r._id,
          }),
        }));
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount: await Record.accessibleBy(ability, 'read').countDocuments(
            { $and: [mongooseFilter, permissionFilters] }
          ),
        };
      },
    },
    recordsCount: {
      type: GraphQLInt,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForRecords(context.user, parent);
        return Record.accessibleBy(ability, 'read')
          .find({ form: parent.id, archived: { $ne: true } })
          .count();
      },
    },
    versionsCount: {
      type: GraphQLInt,
      resolve(parent) {
        return Version.find().where('_id').in(parent.versions).count();
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      resolve(parent) {
        return Version.find().where('_id').in(parent.versions);
      },
    },
    fields: { type: GraphQLJSON },
    canSee: {
      type: GraphQLBoolean,
      async resolve(parent: Form, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('read', parent);
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('update', parent);
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('delete', parent);
      },
    },
    canCreateRecords: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForRecords(context.user, parent);
        return ability.can('create', 'Record');
      },
    },
    uniqueRecord: {
      type: RecordType,
      resolve(parent, args, context) {
        const user = context.user;
        if (
          parent.permissions.recordsUnicity &&
          parent.permissions.recordsUnicity.length > 0 &&
          parent.permissions.recordsUnicity[0].role
        ) {
          const unicityFilters = getFormPermissionFilter(
            user,
            parent,
            'recordsUnicity'
          );
          if (unicityFilters.length > 0) {
            return Record.findOne({
              $and: [
                { form: parent._id, archived: { $ne: true } },
                { $or: unicityFilters },
              ],
            });
          }
        }
        return null;
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
    metadata: {
      type: new GraphQLList(FieldMetaDataType),
      resolve(parent, _, context) {
        return getMetaData(parent, context);
      },
    },
  }),
});

/** GraphQL form connection type definition */
export const FormConnectionType = Connection(FormType);
