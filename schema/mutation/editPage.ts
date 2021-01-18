import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { PageType } from "../types";
import mongoose from 'mongoose';
import { Page, Workflow, Dashboard, Form } from "../../models";

export default {
    /*  Finds a page from its id and update it, if user is authorized.
        Update also the name and permissions of the linked content if it's not a form.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: PageType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        if (!args || (!args.name && !args.permissions)) throw new GraphQLError(errors.invalidEditPageArguments);
        const user = context.user;
        const update: { modifiedAt?: Date, name?: string, permissions?: any } = {
            modifiedAt: new Date()
        };
        Object.assign(update,
            args.name && { name: args.name },
            args.permissions && { permissions: args.permissions }
        );
        let page = null;
        if (checkPermission(user, permissions.canManageApplications)) {
            page = await Page.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
        } else {
            const filters = {
                'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            page = await Page.findOneAndUpdate(
                filters,
                update,
                { new: true }
            );
        }
        if (!page) throw new GraphQLError(errors.dataNotFound);
        if (update.permissions) delete update.permissions;
        switch (page.type) {
            case contentType.workflow:
                await Workflow.findByIdAndUpdate(page.content, update);
                break;
            case contentType.dashboard:
                await Dashboard.findByIdAndUpdate(page.content, update);
                break;
            case contentType.form:
                if (update.name) delete update.name;
                await Form.findByIdAndUpdate(page.content, update);
                break;
            default:
                break;
        }
        return page;
    }
}