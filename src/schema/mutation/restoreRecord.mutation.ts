import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

/**
 * Restore, if user has permission to update associated form / resource.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // Get the record
    const record = await Record.findById(args.id).populate({
      path: 'form',
      model: 'Form',
    });
    // Check ability
    const ability = await extendAbilityForRecords(user, record.form);
    if (ability.cannot('update', record)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    // Update the record
    return Record.findByIdAndUpdate(
      record._id,
      { archived: false },
      { new: true }
    );
  },
};
