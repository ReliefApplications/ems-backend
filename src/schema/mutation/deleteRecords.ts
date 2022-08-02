import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import { getFormPermissionFilter } from '../../utils/filter';
import { Record } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';
import mongoose from 'mongoose';

export default {
  /*  Deletes multiple records.
        Throws an error if not logged or authorized.
    */
  type: GraphQLInt,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // Get records and forms objects
    const toDelete: Record[] = [];
    const records: Record[] = await Record.find({
      _id: { $in: args.ids },
    }).populate({
      path: 'form',
      model: 'Form',
    });

    // Create list of records to delete
    for (const record of records) {
      // Check ability
      const ability: AppAbility = defineUserAbilitiesOnForm(user, record.form);
      // check ability in global roles and app roles for this form
      let canDelete = ability.can('delete', 'Record');
      if (!canDelete && !args.hardDelete) {
        const permissionFilters = getFormPermissionFilter(
          user,
          record.form,
          'canDeleteRecords'
        );
        canDelete =
          permissionFilters.length > 0
            ? await Record.exists({
                $and: [{ _id: record.id }, { $or: permissionFilters }],
              })
            : !record.form.permissions.canUpdateRecords.length;
      }
      if (canDelete) {
        toDelete.push(record);
      }
    }

    // Delete the records
    if (args.hardDelete) {
      const result = await Record.deleteMany({
        _id: { $in: toDelete.map((x) => mongoose.Types.ObjectId(x.id)) },
      });
      return result.deletedCount;
    } else {
      const result = await Record.updateMany(
        { _id: { $in: toDelete.map((x) => mongoose.Types.ObjectId(x.id)) } },
        { archived: true },
        { new: true }
      );
      return result.nModified;
    }
  },
};
