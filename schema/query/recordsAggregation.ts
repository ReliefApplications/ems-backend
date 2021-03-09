import { GraphQLNonNull } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Record } from "../../models";
import { EJSON } from 'bson';

export default {
    /* Take an aggregation configuration as parameter.
        Returns aggregated records data.
    */
    type: GraphQLJSON,
    args: {
        pipeline: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    resolve(parent, args, context) {
        const pipeline = EJSON.deserialize(args.pipeline);
        return Record.aggregate([pipeline]);
    }
}