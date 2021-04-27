import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList, GraphQLInt, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { AccessType, ResourceType, RecordType, VersionType } from ".";
import errors from "../../const/errors";
import { Resource, Record, Version } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import convertFilter from "../../utils/convertFilter";
import getPermissionFilters from "../../utils/getPermissionFilters";

export const BasicFormType = new GraphQLObjectType({
    name: 'BasicForm',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        status: { type: GraphQLString },
        core: {
            type: GraphQLBoolean,
            resolve(parent, args) {
                return parent.core ? parent.core : false;
            },
        },
        recordsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Record.find({ form: parent.id }).count();
            },
        },
        versionsCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return Version.find().where('_id').in(parent.versions).count();
            },
        },
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
    }),
});
