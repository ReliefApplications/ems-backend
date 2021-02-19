import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { StepType } from "../types";
import { Step } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Returns step from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: StepType,
    args : {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Step.accessibleBy(ability, 'read').where({_id: args.id}).getFilter();
        const step = await Step.findOne(filters);
        if (!step) {
            throw new GraphQLError(errors.permissionNotGranted);
        }
        return step;
    }
}