import { GraphQLNonNull, GraphQLID, GraphQLString, GraphQLList, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import protectedNames from "../../const/protectedNames";
import { WorkflowType } from "../types";
import mongoose from 'mongoose';
import { Workflow, Page, Step } from "../../models";

export default {
    /*  Finds a workflow from its id and update it, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: WorkflowType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        steps: { type: new GraphQLList(GraphQLID) },
    },
    async resolve(parent, args, context) {
        if (!args || (!args.name && !args.steps)) {
            throw new GraphQLError(errors.invalidEditWorkflowArguments);
        } else {
            if (protectedNames.indexOf(args.name.toLowerCase()) >= 0) {
                throw new GraphQLError(errors.usageOfProtectedName);
            }
            const user = context.user;
            let update = {
                modifiedAt: new Date()
            };
            Object.assign(update,
                args.name && { name: args.name },
                args.steps && { steps: args.steps },
            );
            if (checkPermission(user, permissions.canManageApplications)) {
                return Workflow.findByIdAndUpdate(
                    args.id,
                    update,
                    { new: true }
                );
            } else {
                const filters = {
                    'permissions.canUpdate': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                    content: args.id
                };
                update = {
                    modifiedAt: new Date()
                };
                Object.assign(update,
                    args.name && { name: args.name },
                );
                const page = await Page.findOneAndUpdate(filters, update);
                const step = await Step.findOneAndUpdate(filters, update);
                if (page || step) {
                    Object.assign(update,
                        args.steps && { steps: args.steps },
                    );
                    return Workflow.findByIdAndUpdate(
                        args.id,
                        update,
                        { new: true }
                    );
                }
            }
        }

    }
}