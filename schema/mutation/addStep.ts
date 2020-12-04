import { GraphQLString, GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import { contentType } from "../../const/contentType";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Workflow, Dashboard, Step } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { StepType } from "../types";

export default {
    /*  Creates a new step linked to an existing workflow.
        Creates also the associated Dashboard if it's the step's type.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: StepType,
    args: {
        name: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLID },
        workflow: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        if (!args.workflow || !(args.type in contentType)) {
            throw new GraphQLError(errors.invalidAddStepArguments);
        } else {
            const user = context.user;
            if (checkPermission(user, permissions.canManageApplications)) {
                const workflow = await Workflow.findById(args.workflow);
                if (!workflow) throw new GraphQLError(errors.dataNotFound);
                // Create a linked Dashboard if necessary
                if (args.type === contentType.dashboard) {
                    const dashboard = new Dashboard({
                        name: args.name,
                        createdAt: new Date(),
                    });
                    await dashboard.save();
                    args.content = dashboard._id;
                }
                // Create a new step.
                const step = new Step({
                    name: args.name,
                    createdAt: new Date(),
                    type: args.type,
                    content: args.content,
                    permissions: {
                        canSee: [],
                        canCreate: [],
                        canUpdate: [],
                        canDelete: []
                    }
                });
                await step.save();
                // Link the new step to the corresponding application by updating this application.
                const update = {
                    modifiedAt: new Date(),
                    $push: { steps: step.id },
                };
                await Workflow.findByIdAndUpdate(
                    args.workflow,
                    update,
                );
                return step;
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
    }
}