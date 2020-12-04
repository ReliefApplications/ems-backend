import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';
import { Application } from "../../models";

export default {
    /*  List all applications available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ApplicationType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Application.find({});
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
            };
            return Application.find(filters);
        }
    }
}