import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import errors from "../../const/errors";
import { Form, Record, Version } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import transformRecord from "../../utils/transformRecord";
import { RecordType } from "../types";
import mongoose from 'mongoose';

export default {
    /*  Edits an existing record.
        Create also an new version to store previous configuration.
    */
    type: RecordType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        data: { type: GraphQLJSON },
        version: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        if (!args.data && !args.version) {
            throw new GraphQLError(errors.invalidEditRecordArguments)
        }
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const oldRecord: Record = await Record.findById(args.id);
        if (oldRecord && ability.can('update', oldRecord)) {
            const version = new Version({
                createdAt: oldRecord.modifiedAt ? oldRecord.modifiedAt : oldRecord.createdAt,
                data: oldRecord.data,
                createdBy: context.user.id
            });
            if (!args.version) {
                const form = await Form.findById(oldRecord.form);
                transformRecord(args.data, form.fields);
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
                const oldVersion = await Version.findOne({
                    $and: [
                        { _id: { $in: oldRecord.versions.map(x => mongoose.Types.ObjectId(x))} },
                        { _id: args.version }
                    ]
                });
                const update: any = {
                    data: oldVersion.data,
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
            }
        } else {
            throw new GraphQLError(errors.dataNotFound);
        }
    },
}