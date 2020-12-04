import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import deleteContent from "../../services/deleteContent";
import checkPermission from "../../utils/checkPermission";
import { StepType } from "../types";
import mongoose from 'mongoose';
import Workflow from '../../models/workflow';
import Step from '../../models/step';

export default {
    /*  Delete a step from its id and erase its reference in the corresponding workflow.
        Delete also the linked dashboard if it has one.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: StepType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        const workflow = await Workflow.findOne({ steps: args.id });
        if (!workflow) throw new GraphQLError(errors.dataNotFound);
        let step;
        if (checkPermission(user, permissions.canManageApplications)) {
            step = await Step.findByIdAndDelete(args.id);
        } else {
            // Check if we can update workflow and delete step
            // if (workflow.permissions.canUpdate.some(x => context.user.roles.map(x => mongoose.Types.ObjectId(x._id)).includes(x))) {
            // }
            const filters = {
                'permissions.canDelete': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                _id: args.id
            };
            step = await Step.findOneAndDelete(filters);
        }
        if (!step) throw new GraphQLError(errors.permissionNotGranted);
        await deleteContent(step);
        const update = {
            modifiedAt: new Date(),
            $pull: { steps: args.id }
        };
        await Workflow.findByIdAndUpdate(
            workflow.id,
            update,
            { new: true }
        );
        return step;
    }
}