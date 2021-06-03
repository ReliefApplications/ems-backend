import { GraphQLID } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ApplicationType } from "../types";

export default {
    type: ApplicationType,
    args: {
        id: { type: GraphQLID },
    },
    subscribe: (parent, args, context) => {
        return withFilter(
            () => context.pubsub.asyncIterator('app_edited'),
            (payload, variables) => {
                if (variables.id) {
                    return payload.application._id === variables.id
                }
                return true;
            }
        )(parent, args, context)
    }
}