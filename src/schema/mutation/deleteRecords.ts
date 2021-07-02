import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList, GraphQLInt } from 'graphql';
import getPermissionFilters from '../../utils/getPermissionFilters';
import errors from '../../const/errors';
import { Record, Version } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';

export default {
    /*  Deletes multiple records.
        Throws an error if not logged or authorized.
    */
    type: GraphQLInt,
    args: {
        ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = user.ability;
        const toDelete: Record[] = [];
        const records: Record[] = await Record.find({ _id: { $in: args.ids }})
            .populate({
                path: 'form',
                model: 'Form'
            });
        for (const record of records) {
            let canDelete = false;
            if (ability.can('delete', 'Record')) {
                canDelete = true;
            } else {
                const permissionFilters = getPermissionFilters(user, record.form, 'canDeleteRecords');
                canDelete = permissionFilters.length > 0 ? await Record.exists({ $and: [{ _id: record.id }, { $or: permissionFilters }] }) : !record.form.permissions.canUpdateRecords.length;
            }
            if (canDelete) {
                toDelete.push(record)
            }
        }
        const versions = [];
        for (const record of toDelete) {
            versions.push(record.versions.map(x => mongoose.Types.ObjectId(x)));
        }
        const result = await Record.deleteMany({ _id: { $in: toDelete.map(x => mongoose.Types.ObjectId(x.id))}});
        await Version.deleteMany({ _id: { $in: versions }});
        return result.deletedCount;
    }
}
