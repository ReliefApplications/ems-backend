import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import { Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

/**
 * Delete multiple records.
 * Throw an error if not logged or authorized.
 */
export default {
  type: GraphQLInt,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
      const ability = await extendAbilityForRecords(user, record.form);
      if (ability.can('delete', record)) {
        toDelete.push(record);
      }
    }

    // Delete the records
    if (args.hardDelete) {
      const result = await Record.deleteMany({
        _id: { $in: toDelete.map((x) => x._id) },
      });
      return result.deletedCount;
    } else {
      const result = await Record.updateMany(
        { _id: { $in: toDelete.map((x) => x._id) } },
        { archived: true },
        { new: true }
      );
      return result.nModified;
    }
  },
};
