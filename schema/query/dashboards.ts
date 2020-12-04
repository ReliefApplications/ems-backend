import { GraphQLList, GraphQLBoolean, GraphQLError } from "graphql";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { DashboardType } from "../types";
import Dashboard from '../../models/dashboard';
import Page from '../../models/page';
import Step from '../../models/step';

export default {
    /*  List all dashboards available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(DashboardType),
    args: {
        all: { type: GraphQLBoolean }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        const filters = {};
        if (!args.all) {
            const contentIds = await Page.find({
                'type': { $eq: contentType.dashboard },
                'content': { $ne: null }
            }).distinct('content');
            const stepIds = await Step.find({
                'type': { $eq: contentType.dashboard },
                'content': { $ne: null }
            }).distinct('content');
            Object.assign(filters, { _id: { $nin: contentIds.concat(stepIds) } });
        }
        if (checkPermission(user, permissions.canSeeApplications)) {
            return Dashboard.find(filters);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}