import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ResourceType } from "../types";
import Resource from '../../models/resource';
import mongoose from 'mongoose';

export default {
    /*  Returns resource from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: ResourceType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeResources)) {
            return Resource.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Resource.findOne(filters);
        }
    },
}