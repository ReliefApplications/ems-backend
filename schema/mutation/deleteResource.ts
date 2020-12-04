import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource } from "../../models";

export default {
    /*  Deletes a resource from its id.
        Throws GraphQL error if not logged or authorized.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageResources)) {
            return Resource.findByIdAndRemove(args.id);
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Resource.findOneAndRemove(filters);
        }
    },
}