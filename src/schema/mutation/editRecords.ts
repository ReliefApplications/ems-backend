import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { Record, Version, Form } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { transformRecord, cleanRecord } from '../../utils/form';
import { RecordType } from '../types';
import { getFormPermissionFilter } from '../../utils/filter';

export default {
    /*  Edits existing records.
        Create also an new version to store previous configuration.
    */
    type: new GraphQLList(RecordType),
    args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
        template: { type: GraphQLID }
    },
    async resolve(parent, args, context) {
        if (!args.data) {
            throw new GraphQLError(errors.invalidEditRecordArguments)
        }
        // Authentication check
        const user = context.user;
        const records: Record[] = [];
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = user.ability;
        const oldRecords: Record[] = await Record.find({ _id: { $in: args.ids }})
            .populate({
                path: 'form',
                model: 'Form'
            });
        for (const record of oldRecords) {
            let canUpdate = false;
            if (ability.can('update', record)) {
                canUpdate = true;
            } else {
                const permissionFilters = getFormPermissionFilter(user, record.form, 'canUpdateRecords');
                canUpdate = permissionFilters.length > 0 ? await Record.exists({ $and: [{ _id: record.id }, { $or: permissionFilters }] }) : !record.form.permissions.canUpdateRecords.length;
            }
            if (canUpdate) {
                const data = cleanRecord({ ...args.data });
                let fields = record.form.fields;
                if (args.template) {
                    const template = await Form.findById(args.template, 'fields resource');
                    if (!template.resource.equals(record.form.resource)) {
                        throw new GraphQLError(errors.templateIsNotFromSameResource);
                    }
                    fields = template.fields;
                }
                await transformRecord(data, fields)
                const version = new Version({
                    createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
                    data: record.data,
                    createdBy: user.id
                });
                const update: any = {
                    data: { ...record.data, ...data },
                    modifiedAt: new Date(),
                    $push: { versions: version._id },
                };
                await Record.findByIdAndUpdate(
                    record.id,
                    update,
                    { new: true }
                );
                await version.save();
                records.push(record);
            }
        }
        return records
    },
}
