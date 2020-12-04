import { GraphQLList } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { StepType } from "../types";
import mongoose from 'mongoose';
import { Step } from "../../models";

export default {
    /*  List all steps available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(StepType),
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Step.find({});
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id))}
            };
            return Step.find(filters);
        }
    }
}