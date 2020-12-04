import { GraphQLNonNull, GraphQLID } from "graphql";
import { Record } from "../../models";
import { RecordType } from "../types";

export default {
    /*  Returns record from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args) {
        return Record.findById(args.id);
    },
}