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
import { accessibleBy } from '@casl/mongoose';

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
    allowUploadRecords: { type: GraphQLBoolean },
    permissions: {
      type: AccessType,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForContent(context.user, parent);
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    resource: {
      type: ResourceType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const resource = await Resource.findOne({
          _id: parent.resource,
          ...accessibleBy(ability, 'read').Resource,
        });
        return resource;
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
        let mongooseFilter: any = {
          form: parent.id,
          archived: args.archived ? true : { $ne: true },
        };

        if (args.filter) {
          mongooseFilter = {
            ...mongooseFilter,
            ...getFilter(
              { logic: 'and', filters: args.filter },
              parent.fields,
              {
                ...context,
                resourceFieldsById: {
                  [parent.resource]: parent.fields,
                },
              }
            ),
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
        // Filter from the user permissions
        const permissionFilters = Record.find(
          accessibleBy(ability, 'read').Record
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
            $and: [
              mongooseFilter,
              permissionFilters,
              accessibleBy(ability, 'read').Record,
            ],
          }),
        };
      },
    },
    recordsCount: {
      type: GraphQLInt,
      async resolve(parent, args, context) {
        const ability = await extendAbilityForRecords(context.user, parent);
        const count = await Record.find({
          form: parent.id,
          archived: { $ne: true },
          ...accessibleBy(ability, 'read').Record,
        }).count();
        return count;
      },
    },
    versionsCount: {
      type: GraphQLInt,
      async resolve(parent) {
        const versions = Version.find()
          .where('_id')
          .in(parent.versions)
          .count();
        return versions;
      },
    },
    versions: {
      type: new GraphQLList(VersionType),
      async resolve(parent) {
        const versions = Version.find().where('_id').in(parent.versions);
        return versions;
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
      async resolve(parent, args, context) {
        const user = context.user;
        if (
          parent.permissions.recordsUnicity &&
          parent.permissions.recordsUnicity.length > 0
        ) {
          const unicityFilters = getFormPermissionFilter(
            user,
            parent,
            'recordsUnicity'
          );
          if (unicityFilters.length > 0) {
            const record = await Record.findOne({
              $and: [
                { form: parent._id, archived: { $ne: true } },
                { $or: unicityFilters },
              ],
            });
            return record;
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
