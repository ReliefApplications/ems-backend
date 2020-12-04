import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { DashboardType } from "../types";
import Dashboard from '../../models/dashboard';
import mongoose from 'mongoose';
import Step from '../../models/step';
import Page from '../../models/page';

export default {
    /*  Returns dashboard from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: DashboardType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Dashboard.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                content: args.id
            };
            const page = await Page.find(filters);
            const step = await Step.find(filters);
            if (page || step) {
                return Dashboard.findById(args.id);
            }
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}