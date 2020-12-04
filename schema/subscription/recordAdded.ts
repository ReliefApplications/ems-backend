import { GraphQLID } from "graphql";
import { withFilter } from "graphql-subscriptions";
import pubsub from "../../server/pubsub";
import { RecordType } from "../types";

export default {
    type: RecordType,
    args: {
        resource: { type: GraphQLID },
        form: { type: GraphQLID },
    },
    subscribe: withFilter(
        () => pubsub.asyncIterator('record_added'),
        (payload, variables) => {
            if (variables.resource) {
                return payload.recordAdded.resource === variables.resource;
            }
            if (variables.form) {
                return payload.recordAdded.form === variables.form;
            }
            return true;
        }
    )
}