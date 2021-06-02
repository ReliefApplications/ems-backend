import { GraphQLID } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ApplicationType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    type: ApplicationType,
    args: {
        id: { type: GraphQLID },
    },
    subscribe: (parent, args, context) => {
        console.log("je passe ici");
        const ability: AppAbility = context.user.ability;
        return withFilter(
            () => context.pubsub.asyncIterator('app_edited'), // TODO
            (payload, variables) => {
                console.log("payload = ", payload);
                console.log("variables = ", variables);
                // if (variables.resource) {
                //     return payload.recordAdded.resource === variables.resource;
                // }
                // if (variables.form) {
                //     return payload.recordAdded.form === variables.form;
                // }
                return true;
            }
        )(parent, args, context)
    }
}