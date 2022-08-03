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
  LayoutType,
} from '.';
import { Resource, Record, Version } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import { getFormPermissionFilter } from '../../utils/filter';
import { StatusEnumType } from '../../const/enumTypes';
import { Connection, decodeCursor, encodeCursor } from './pagination';
import getFilter from '../../utils/schema/resolvers/Query/getFilter';
import { pascalCase } from 'pascal-case';
import { pluralize } from 'inflection';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';

/** GraphQL form type definition */
export const FormType = new GraphQLObjectType({
  name: 'Form',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    queryName: {
      type: GraphQLString,
      resolve(parent) {
        return 'all' + pluralize(pascalCase(parent.name));
      },
    },
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
        filter: { type: GraphQLJSON },
        archived: { type: GraphQLBoolean },
      },
      async resolve(parent, args, context) {
        const ability: AppAbility = defineUserAbilitiesOnForm(
          context.user,
          parent
        );
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
        let items = await Record.accessibleBy(ability, 'read')
          .find({ $and: [cursorFilters, mongooseFilter] })
          .limit(args.first + 1);
        const hasNextPage = items.length > args.first;
        if (hasNextPage) {
          items = items.slice(0, items.length - 1);
        }
        const edges = items.map((r) => ({
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
          totalCount: await Record.accessibleBy(ability, 'read').countDocuments(
            mongooseFilter
          ),
        };
      },
    },
    recordsCount: {
      type: GraphQLInt,
      resolve(parent, args, context) {
        const ability: AppAbility = defineUserAbilitiesOnForm(
          context.user,
          parent
        );
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
        const ability: AppAbility = defineUserAbilitiesOnForm(
          context.user,
          parent
        );
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
      type: new GraphQLList(LayoutType),
    },
  }),
});

/** GraphQL form connection type definition */
export const FormConnectionType = Connection(FormType);
