import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { DashboardType } from "../types";
import { Dashboard, Page, Step } from "../../models";

export default {
    /*  Returns dashboard from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: DashboardType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability = context.user.ability;
        if (ability.can('read', 'Dashboard')) {
            return Dashboard.findById(args.id);
        } else {
            const filterStep = Step.accessibleBy(ability).where({content: args.id}).getFilter();
            const filterPage = Page.accessibleBy(ability).where({content: args.id}).getFilter();
            const step = await Step.findOne(filterStep);
            const page = await Page.findOne(filterPage);
            if (page || step) {
                return Dashboard.findById(args.id);
            }
        }
        throw new GraphQLError(errors.permissionNotGranted);
    }
}