import { GraphQLNonNull, GraphQLID } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { RecordType } from "../types";
import Record from '../../models/record';

export default {
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args) {
        const oldRecord = await Record.findById(args.id);
        const record = Record.findByIdAndUpdate(
            args.id,
            {
                data: { ...oldRecord.data, ...args.data },
                modifiedAt: new Date(),
            },
            { new: true }
        );
        return record;
    },
}