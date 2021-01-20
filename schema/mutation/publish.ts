import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GraphQLJSON from "graphql-type-json";
import pubsubSafe from "../../server/pubsubSafe";

export default {
    type: GraphQLBoolean,
    args: {
        routingKey: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLJSON) }
    },
    async resolve(parent, args, context) {
        const publisher = await pubsubSafe();
        publisher.publish(`${process.env.RABBITMQ_APPLICATION}.${args.routingKey}`, args.content);
        return true;
    }
}