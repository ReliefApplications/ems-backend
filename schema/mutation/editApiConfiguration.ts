import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { ApiConfiguration } from "../../models";
import { ApiConfigurationType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";
import GraphQLJSON from "graphql-type-json";
import { AuthEnumType, StatusEnumType } from "../../const/enumTypes";

export default {
    /*  Edit the passed apiConfiguration if authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApiConfigurationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        status: { type: StatusEnumType },
        authType: { type: AuthEnumType },
        settings: { type: GraphQLJSON },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (!args.name && !args.status && !args.authType && !args.settings && !args.permissions) {
            throw new GraphQLError(errors.invalidEditApiConfigurationArguments);
        }
        if (ability.can('update', parent)) {
            const update = {};
            Object.assign(update,
                args.name && { name: args.name },
                args.status && { status: args.status },
                args.authType && { authType: args.authType },
                args.settings && { settings: args.settings },
                args.permissions && { permissions: args.permissions }
            );
            return ApiConfiguration.findByIdAndUpdate(args.id, update, {new: true});
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}