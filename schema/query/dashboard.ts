import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { DashboardType } from "../types";
import { Dashboard, Page, Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Returns dashboard from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: DashboardType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', 'Application')) {
            let step, page = null;
            const filterStep = Step.accessibleBy(ability, 'read').where({content: args.id}).getFilter();
            const filterPage = Page.accessibleBy(ability, 'read').where({content: args.id}).getFilter();
            step = await Step.findOne(filterStep);
            page = await Page.findOne(filterPage);
            if (page || step) {
                return Dashboard.findById(args.id);
            }
        } 
        throw new GraphQLError(errors.permissionNotGranted);
    }
}