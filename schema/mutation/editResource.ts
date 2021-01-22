import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource } from "../../models";
import buildSchema from "../../utils/buildSchema";
import buildTypes from "../../utils/buildTypes";

export default {
    /*  Edits an existing resource.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        fields: { type: new GraphQLList(GraphQLJSON) },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        if (!args || (!args.fields && !args.permissions)) {
            throw new GraphQLError(errors.invalidEditResourceArguments);
        } else {
            const update = {};
            Object.assign(update,
                args.fields && { fields: args.fields },
                args.permissions && { permissions: args.permissions }
            );
            const user = context.user;
            if (checkPermission(user, permissions.canManageResources)) {
                return Resource.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true },
                    () => buildTypes()
                );
            } else {
                const filters = {
                    'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                    _id: args.id
                };
                return Resource.findOneAndUpdate(
                    filters,
                    update,
                    { new: true },
                    () => buildTypes()
                );
            }
        }
    },
}