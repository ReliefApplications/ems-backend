import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLInt } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { AccessType, ResourceType, RecordType, VersionType } from '.';
import { Resource, Record, Version } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';
import { getRecordAccessFilter, getFormFilter } from '../../utils/filter';
import { StatusEnumType } from '../../const/enumTypes';
import { Connection } from './pagination';

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
      type: new GraphQLList(RecordType),
      args: {
        filters: { type: GraphQLJSON },
        archived: { type: GraphQLBoolean },
      },
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        let filters: any = {
          form: parent.id,
        };
        if (args.archived) {
          filters.archived = true;
        } else {
          filters.archived = { $ne: true };
        }
        if (args.filters) {
          const mongooseFilters = getFormFilter(args.filters, parent.fields);
          filters = { ...filters, ...mongooseFilters };
        }
        if (ability.can('read', parent) || ability.can('update', parent)) {
          return Record.find(filters);
        } else {
          return Record.find(filters).accessibleBy(ability, 'read');
        }
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
