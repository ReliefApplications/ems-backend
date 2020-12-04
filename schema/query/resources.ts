import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import mongoose from 'mongoose';
import { Resource } from "../../models";

export default {
    /*  List all resources available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ResourceType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeResources)) {
            return Resource.find({});
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) }
            };
            return Resource.find(filters);
        }
    },
}
