import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLInt, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { AccessType, ResourceType, RecordType, VersionType } from ".";
import errors from "../../const/errors";
import { Resource, Record, Version } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import convertFilter from "../../utils/convertFilter";
import getPermissionFilters from "../../utils/getPermissionFilters";

export const FormType = new GraphQLObjectType({
    name: 'Form',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
        status: { type: GraphQLString },
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        resource: {
            type: ResourceType,
            resolve(parent, args) {
                return Resource.findById(parent.resource);
            },
        },
        core: {
            type: GraphQLBoolean,
            resolve(parent, args) {
                return parent.core ? parent.core : false;
            },
        },
        records: {
            type: new GraphQLList(RecordType),
            args: {
                filters: { type: GraphQLJSON },
            },
            resolve(parent, args, context) {
                // Filter with argument
                const filters = {
                    form: parent.id
                };
                if (args.filters) {
                    for (const filter of args.filters) {
                        filters[`data.${filter.name}`] = filter.equals;
                    }
                }
                // Check ability
                const user = context.user;
                const ability: AppAbility = user.ability;
                if (ability.can('read', 'Record')) {
                    return Record.find(filters);
                // Check second layer of permissions
                } else {
                    const permissionFilters = getPermissionFilters(user, parent, 'canSeeRecords');
                    return Record.find(permissionFilters.length ? { $and: [filters, { $or: permissionFilters }] } : filters)
                }

            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ form: parent.id }).count();
            },
        },
        versions: {
            type: new GraphQLList(VersionType),
            resolve(parent, args) {
                return Version.find().where('_id').in(parent.versions);
            },
        },
        fields: { type: GraphQLJSON },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', parent);
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', parent);
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent);
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', parent);
            }
        },
        canCreateRecords: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('create', 'Record')) { return true; }
                const roles = context.user.roles.map(x => x._id);
                return parent.permissions.canCreateRecords ? parent.permissions.canCreateRecords.some(x => roles.includes(x)) : false;
            }
        },
        uniqueRecord: {
            type: RecordType,
            resolve(parent, args, context) {
                const user = context.user;
                if (parent.permissions.recordsUnicity) {
                    const unicityFilter = convertFilter(parent.permissions.recordsUnicity, Record, user);
                    if (unicityFilter) {
                        return Record.findOne({ $and: [{ form: parent._id }, unicityFilter] });
                    }
                }
                return null;
            }
        }
    }),
});