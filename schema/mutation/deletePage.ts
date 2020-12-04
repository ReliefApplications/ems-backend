import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import deleteContent from "../../services/deleteContent";
import checkPermission from "../../utils/checkPermission";
import { PageType } from "../types";
import mongoose from 'mongoose';
import { Page, Application } from "../../models";

export default {
    /*  Delete a page from its id and erase its reference in the corresponding application.
        Also delete recursively the linked Workflow or Dashboard
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: PageType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let page = null;
        if (checkPermission(user, permissions.canManageApplications)) {
            page = await Page.findByIdAndDelete(args.id);
        } else {
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            page = await Page.findOneAndDelete(filters);
        }
        if (!page) throw new GraphQLError(errors.permissionNotGranted);
        const application = await Application.findOne({ pages: args.id });
        if (!application) throw new GraphQLError(errors.dataNotFound);
        const update = {
            modifiedAt: new Date(),
            $pull: { pages: args.id }
        };
        await Application.findByIdAndUpdate(
            application.id,
            update,
            { new: true }
        );
        await deleteContent(page);
        return page;
    }
}