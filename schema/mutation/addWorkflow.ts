import { GraphQLString, GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Page, Workflow } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { WorkflowType } from "../types";

export default {
    /*  Creates a new workflow linked to an existing page.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: WorkflowType,
    args: {
        name: { type: GraphQLString },
        page: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        if (!args.page) {
            throw new GraphQLError(errors.invalidAddWorkflowArguments);
        } else {
            const user = context.user;
            if (checkPermission(user, permissions.canManageApplications)) {
                const page = await Page.findById(args.page);
                if (!page) throw new GraphQLError(errors.dataNotFound);
                if (page.type !== contentType.workflow) throw new GraphQLError(errors.pageTypeError);
                // Create a workflow.
                const workflow = new Workflow({
                    name: args.name,
                    createdAt: new Date(),
                });
                await workflow.save();
                // Link the new workflow to the corresponding page by updating this page.
                const update = {
                    modifiedAt: new Date(),
                    content: workflow._id,
                };
                await Page.findByIdAndUpdate(
                    args.page,
                    update,
                );
                return workflow;
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
    }
}