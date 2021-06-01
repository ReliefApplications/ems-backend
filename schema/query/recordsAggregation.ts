import { GraphQLError, GraphQLNonNull } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Record } from "../../models";
import { EJSON } from 'bson';
import errors from "../../const/errors";

export default {
    /* Take an aggregation configuration as parameter.
        Returns aggregated records data.
    */
    type: GraphQLJSON,
    args: {
        pipeline: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const pipeline = EJSON.deserialize(args.pipeline);
        return Record.aggregate([pipeline]);
    }
}