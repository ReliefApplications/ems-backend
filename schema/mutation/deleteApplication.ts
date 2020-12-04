import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import deleteContent from "../../services/deleteContent";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";
import mongoose from 'mongoose';
import Application from '../../models/application';
import Page from '../../models/page';
import Role from '../../models/role';

export default {
    /*  Deletes an application from its id.
        Recursively delete associated pages and dashboards/workflows.
        Throw GraphQLError if not authorized.
    */
    type: ApplicationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let application = null;
        if (checkPermission(user, permissions.canManageApplications)) {
            application = await Application.findByIdAndDelete(args.id);
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            application = await Application.findOneAndDelete(filters);
        }
        if (!application) throw new GraphQLError(errors.permissionNotGranted);
        // Delete pages and content recursively
        if (application.pages.length) {
            for (const pageID of application.pages) {
                const page = await Page.findByIdAndDelete(pageID);
                await deleteContent(page);
            }
        }
        // Delete application's roles
        await Role.deleteMany({application: args.id});
        return application;
    }
}