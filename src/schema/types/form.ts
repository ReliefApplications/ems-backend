import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLInt } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, ResourceType, RecordType, VersionType, RecordConnectionType } from '.';
import { Resource, Record, Version } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import { getRecordAccessFilter, getFormFilter, getFormPermissionFilter } from '../../utils/filter';
import { StatusEnumType } from '../../const/enumTypes';
import { Connection, decodeCursor, encodeCursor } from './pagination';

/**
 * GraphQL Form type.
 */
export const FormType = new GraphQLObjectType({
  name: 'Form',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    structure: { type: GraphQLJSON },
    status: { type: StatusEnumType },
    permissions: {
      type: AccessType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
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
        filters: { type: GraphQLJSON },
        archived: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        let mongooseFilter: any = {
          form: parent.id,
        };
        if (args.archived) {
          Object.assign(mongooseFilter, { archived: true });
        } else {
          Object.assign(mongooseFilter, { archived: { $ne: true } });
        }
        if (args.filters) {
          mongooseFilter = { ...mongooseFilter, ...getFormFilter(args.filters, parent.fields) };
        }
        // PAGINATION
        const cursorFilters = args.afterCursor ? {
          _id: {
            $gt: decodeCursor(args.afterCursor),
          },
        } : {};
        let filters: any = {};
        // Filter from the user permissions
        let permissionFilters = [];
        if (ability.cannot('read', 'Record')) {
          permissionFilters = getFormPermissionFilter(context.user, parent, 'canSeeRecords');
          if (permissionFilters.length > 0) {
            filters = { $and: [mongooseFilter, { $or: permissionFilters }] };
          } else {
            // If permissions are set up and no one match our role return null
            if (parent.permissions.canSeeRecords.length > 0) {
              return {
                pageInfo: {
                  hasNextPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                edges: [],
                totalCount: 0,
              };
            } else {
              filters = mongooseFilter;
            }
          }
        } else {
          filters = mongooseFilter;
        }
        let items = await Record.find({ $and: [cursorFilters, filters] })
          .limit(args.first + 1);
        const hasNextPage = items.length > args.first;
        if (hasNextPage) {
          items = items.slice(0, items.length - 1);
        }
        const edges = items.map(r => ({
          cursor: encodeCursor(r.id.toString()),
          node: r,
        }));
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount: await Record.countDocuments(filters),
        };
      },
    },
    recordsCount: {
      type: GraphQLInt,
      resolve(parent) {
        return Record.find({ form: parent.id, archived: { $ne: true } }).count();
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
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', parent)) {
          return true;
        } else if (context.user.isAdmin) {
          return canAccessContent(parent.id, 'read', ability);
        }
        return false;
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
    canCreateRecords: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('create', 'Record')) { return true; }
        const roles = context.user.roles.map(x => x._id);
        return parent.permissions.canCreateRecords.length > 0 ? parent.permissions.canCreateRecords.some(x => roles.includes(x)) : true;
      },
    },
    uniqueRecord: {
      type: RecordType,
      resolve(parent, args, context) {
        const user = context.user;
        if (parent.permissions.recordsUnicity) {
          const unicityFilter = getRecordAccessFilter(parent.permissions.recordsUnicity, Record, user);
          if (unicityFilter) {
            return Record.findOne({ $and: [{ form: parent._id, archived: { $ne: true } }, unicityFilter] });
          }
        }
        return null;
      },
    },
  }),
});

export const FormConnectionType = Connection(FormType);
