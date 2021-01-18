import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLList, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';
import { Application } from "../../models";
import protectedNames from "../../const/protectedNames";

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
        permissions: { type: GraphQLJSON }
    },
    resolve(parent, args, context) {
        if (args.name && protectedNames.indexOf(args.name.toLowerCase()) >= 0) {
            throw new GraphQLError(errors.usageOfProtectedName);
        }
        if (!args || (!args.name && !args.status && !args.pages && !args.settings && !args.permissions)) {
            throw new GraphQLError(errors.invalidEditApplicationArguments);
        } else {
            const update = {};
            Object.assign(update,
                args.name && { name: args.name },
                args.description && {description: args.description },
                args.status && { status: args.status },
                args.pages && { pages: args.pages },
                args.settings && { settings: args.settings },
                args.permissions && { permissions: args.permissions }
            );
            const user = context.user;
            if (checkPermission(user, permissions.canManageApplications)) {
                return Application.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true }
                );
            } else {
                const filters = {
                    'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                    _id: args.id
                };
                return Application.findOneAndUpdate(
                    filters,
                    update,
                    { new: true }
                );
            }
        }
    }
}