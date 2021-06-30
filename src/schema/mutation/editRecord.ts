import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { Form, Record, Version } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import transformRecord from '../../utils/transformRecord';
import { RecordType } from '../types';
import getPermissionFilters from '../../utils/getPermissionFilters';
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

        const ability: AppAbility = user.ability;
        const oldRecord: Record = await Record.findById(args.id);
        let canUpdate = false;
        // Check permissions with two layers
        if (oldRecord && ability.can('update', oldRecord)) {
            canUpdate = true;
        } else {
            const form = await Form.findById(oldRecord.form);
            const permissionFilters = getPermissionFilters(user, form, 'canUpdateRecords');
            canUpdate = permissionFilters.length > 0 ? await Record.exists({ $and: [{ _id: args.id}, { $or: permissionFilters }] }) : !form.permissions.canUpdateRecords.length;
        }
        if (canUpdate) {
            const version = new Version({
                createdAt: oldRecord.modifiedAt ? oldRecord.modifiedAt : oldRecord.createdAt,
                data: oldRecord.data,
                createdBy: user.id
            });
            if (!args.version) {
                const form = await Form.findById(oldRecord.form);
                await transformRecord(args.data, form.fields);
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
                        { _id: args.version }
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
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}
