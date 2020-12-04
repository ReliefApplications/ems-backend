import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { DashboardType } from "../types";
import mongoose from 'mongoose';
import { Dashboard, Page, Step } from "../../models";

export default {
    /*  Finds dashboard from its id and delete it, if user is authorized.
        Throws an error if not logged or authorized.
    */
    type: DashboardType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageApplications)) {
            return Dashboard.findByIdAndDelete(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                content: args.id
            };
            const page = await Page.find(filters);
            const step = await Step.find(filters);
            if (page || step) {
                return Dashboard.findByIdAndDelete(args.id);
            }
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}