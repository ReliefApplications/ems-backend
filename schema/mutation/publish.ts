import { GraphQLBoolean, GraphQLNonNull } from "graphql";
import GraphQLJSON from "graphql-type-json";
import pubsubSafe from "../../server/pubsubSafe";

export default {
    type: GraphQLBoolean,
    args: {
        content: { type: new GraphQLNonNull(GraphQLJSON) }
    },
    async resolve(parent, args, context) {
        const publisher = await pubsubSafe();
        publisher.publish('', { content: args.content });
        return true;
    }
}