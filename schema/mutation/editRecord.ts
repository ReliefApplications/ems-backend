import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import { Record, Version } from "../../models";
import { RecordType } from "../types";
import mongoose from 'mongoose';

export default {
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args) {
        const oldRecord = await Record.findById(args.id);
        if (oldRecord) {
            const version = new Version({
                createdAt: oldRecord.modifiedAt ? oldRecord.modifiedAt : oldRecord.createdAt,
                data: oldRecord.data,
            });
            const update: any = {
                data: { ...oldRecord.data, ...args.data },
                modifiedAt: new Date(),
                $push: { versions: version._id },
            }
            const record = Record.findByIdAndUpdate(
                args.id,
                update,
                { new: true }
            );
            await version.save();
            return record;
        } else {
            throw new GraphQLError(errors.dataNotFound);
        }
    },
}