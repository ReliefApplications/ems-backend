import { GraphQLList } from "graphql";
import { Record } from "../../models";
import { RecordType } from "../types";

export default {
    /*  List all records available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(RecordType),
    resolve(parent, args, context) {
        return Record.find({});
    },
}