import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { WorkflowType } from "../types";
import mongoose from 'mongoose';
import { Workflow, Page, Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

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
        const ability: AppAbility = context.user.ability;
        let workflow = null;
        if (ability.can('read', 'Application')) {
            let step, page = null;
            const filterStep = Step.accessibleBy(ability, 'read').where({content: args.id}).getFilter();
            const filterPage = Page.accessibleBy(ability, 'read').where({content: args.id}).getFilter();
            step = await Step.findOne(filterStep);
            page = await Page.findOne(filterPage);
            if (page || step) {
                workflow =  Workflow.findById(args.id);
            }
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
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