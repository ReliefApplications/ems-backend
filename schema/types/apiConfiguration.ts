import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { AuthEnumType, StatusEnumType } from "../../const/enumTypes";
import { ApiConfiguration } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import { AccessType } from "./access";

export const ApiConfigurationType = new GraphQLObjectType({
    name: 'ApiConfiguration',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        status: { type: StatusEnumType },
        type: { type: AuthEnumType },
        settings: {
            type: GraphQLJSON,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.settings : parent.settings;
            }
        },
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', new ApiConfiguration(parent));
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', new ApiConfiguration(parent));
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', new ApiConfiguration(parent));
            }
        }
    })
});