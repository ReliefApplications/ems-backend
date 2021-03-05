import { GraphQLNonNull } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Record } from "../../models";
export default {
    /* Take an aggregation configuration as parameter.
        Returns aggregated records data.
    */
    type: GraphQLJSON,
    args: {
        aggregation: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args, context) {
        return Record.aggregate(args.aggregation);
    }
}