import { GraphQLNonNull, GraphQLID } from "graphql";
import { Record, Version } from "../../models";
import { RecordType } from "../types";
import mongoose from 'mongoose';

export default {
    /*  Delete a record, if user has permission to update associated form / resource.
        Throw an error if not logged or authorized.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        const record = await Record.findById(args.id);
        await Version.deleteMany({ _id: { $in: record.versions.map(x => mongoose.Types.ObjectId(x))}});
        return Record.findByIdAndRemove(args.id);
    },
}