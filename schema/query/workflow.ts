import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import checkPermission from "../../utils/checkPermission";
import { WorkflowType } from "../types";
import mongoose from 'mongoose';
import { Workflow, Page, Step } from "../../models";

export default {
    /*  Returns workflow from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: WorkflowType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) },
        asRole: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        let workflow = null;
        if (checkPermission(user, permissions.canSeeApplications)) {
            workflow = await Workflow.findById(args.id);
        } else {
            const filters = {
                'permissions.canSee': { $in: context.user.roles.map(x => mongoose.Types.ObjectId(x._id)) },
                content: args.id
            };
            const page = await Page.find(filters);
            const step = await Step.find(filters);
            if (page || step) {
                workflow = await Workflow.findById(args.id);
            }
        }
        if (workflow) {
            if (args.asRole) {
                const steps = await Step.aggregate([
                    { '$match' : {
                        'permissions.canSee': { $elemMatch: { $eq: mongoose.Types.ObjectId(args.asRole) } },
                        '_id' : { '$in' : workflow.steps }
                    } },
                    { '$addFields' : { '__order' : { '$indexOfArray': [ workflow.steps, '$_id' ] } } },
                    { '$sort' : { '__order' : 1 } }
                ]);
                workflow.steps = steps.map(x => x._id);
            }
            return workflow;
        }
        throw new GraphQLError(errors.permissionNotGranted);
    },
}