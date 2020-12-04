import { GraphQLNonNull, GraphQLID } from "graphql";
import { Record } from "../../models";
import { RecordType } from "../types";

export default {
    /*  Delete a record, if user has permission to update associated form / resource.
        Throw an error if not logged or authorized.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve(parent, args, context) {
        const user = context.user;
        return Record.findByIdAndRemove(args.id);
    },
}