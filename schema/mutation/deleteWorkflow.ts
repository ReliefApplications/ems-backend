import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import deleteContent from "../../services/deleteContent";
import checkPermission from "../../utils/checkPermission";
import { WorkflowType } from "../types";
import mongoose from 'mongoose';
import Page from '../../models/page';
import Workflow from '../../models/workflow';
import Step from '../../models/step';

export default {
    /*  Delete a workflow from its id and recursively delete steps
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: WorkflowType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let workflow = null;
        if (checkPermission(user, permissions.canManageApplications)) {
            workflow = await Workflow.findByIdAndDelete(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                content: args.id
            };
            const page = await Page.find(filters);
            const step = await Step.find(filters);
            if (page || step) {
                workflow = await Workflow.findByIdAndDelete(args.id);
            }
            throw new GraphQLError(errors.permissionNotGranted);
        }
        if (!workflow) throw new GraphQLError(errors.permissionNotGranted);
        for (const step of workflow.steps) {
            await Step.findByIdAndDelete(step.id);
            await deleteContent(step);
        }
        return workflow;
    }
}