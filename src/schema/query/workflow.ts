import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { WorkflowType } from '../types';
import mongoose from 'mongoose';
import { Workflow, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

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
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        let workflow = await Workflow.findOne(Workflow.accessibleBy(ability).where({ _id: args.id }).getFilter());
        // User has manage applications permission
        if (!workflow) {
            // If user is admin and can see parent application, it has access to it
            if (user.isAdmin && await canAccessContent(args.id, 'read', ability)) {
                workflow = await Workflow.findById(args.id);
            } else {
                const filterPage = Page.accessibleBy(ability).where({content: args.id}).getFilter();
                const page = await Page.findOne(filterPage, 'id');
                if (page) {
                    workflow = await Workflow.findById(args.id);
                }
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
