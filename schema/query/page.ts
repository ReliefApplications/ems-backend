import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { PageType } from "../types";
import { Page } from '../../models';
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Returns page from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: PageType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Page.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        const page = await Page.findOne(filters);
        if (!page) {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        return page;
    },
}
