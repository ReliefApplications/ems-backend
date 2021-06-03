import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { ApiConfiguration } from "../../models";
import { ApiConfigurationType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";
import { status } from "../../const/enumTypes";

export default {
    /*  Creates a new apiConfiguration.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApiConfigurationType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (ability.can('create', 'ApiConfiguration')) {
            if (args.name !== '') {
                const apiConfiguration = new ApiConfiguration({
                    name: args.name,
                    status: status.pending,
                    permissions: {
                        canSee: [],
                        canCreate: [],
                        canUpdate: [],
                        canDelete: []
                    }
                });
                return apiConfiguration.save();
            }
            throw new GraphQLError(errors.invalidAddApiConfigurationArguments);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}