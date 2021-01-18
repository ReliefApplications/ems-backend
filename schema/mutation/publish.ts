import { GraphQLBoolean } from "graphql";
import pubsubSafe from "../../server/pubsubSafe";

export default {
    type: GraphQLBoolean,
    args: {},
    async resolve(parent, args, context) {
        const publisher = await pubsubSafe();
        publisher.publish('', { test: 'do you copy ?'});
        return true;
    }
}