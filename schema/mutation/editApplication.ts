import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLList, GraphQLError, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import { ApplicationType } from "../types";
import { Application } from "../../models";
import validateName from "../../utils/validateName";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Finds application from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        description: { type: GraphQLString },
        name: { type: GraphQLString },
        status: { type: GraphQLString },
        pages: { type: new GraphQLList(GraphQLID) },
        settings: { type: GraphQLJSON },
        permissions: { type: GraphQLJSON },
        isLocked: { type: GraphQLBoolean }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        let userId: any = user._id;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!args || (!args.name && !args.status && !args.pages && !args.settings && !args.permissions)) {
            throw new GraphQLError(errors.invalidEditApplicationArguments);
        } else {
            if (args.name) {
                validateName(args.name);
            }
            if (!args.isLocked) {
                userId = [];
            }
            const update = {};
            Object.assign(update,
                args.name && { name: args.name },
                args.description && {description: args.description },
                args.status && { status: args.status },
                args.pages && { pages: args.pages },
                args.settings && { settings: args.settings },
                args.permissions && { permissions: args.permissions },
                new Boolean(args.isLocked) && { isLocked: args.isLocked },
                userId && { isLockedBy: userId },
            );
            const filters = Application.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
            const application = await Application.findOneAndUpdate(filters, update, {new: true});
            if (application) {
                return application;
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
    }
}