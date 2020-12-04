import { GraphQLNonNull, GraphQLID } from "graphql";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { StepType } from "../types";
import mongoose from 'mongoose';
import { Step } from "../../models";

export default {
    /*  Returns step from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: StepType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Step.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            return Step.findOne(filters);
        }
    },
}