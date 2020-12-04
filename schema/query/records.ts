import { GraphQLList } from "graphql";
import { RecordType } from "../types";
import Record from '../../models/record';

export default {
    /*  List all records available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(RecordType),
    resolve(parent, args, context) {
        return Record.find({});
    },
}