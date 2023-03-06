import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

/**
 * Delete a record, if user has permission to update associated form / resource.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // Get the record and form objects
    const record = await Record.findById(args.id);
    const form = await Form.findById(record.form);

    // Check the ability
    const ability = await extendAbilityForRecords(user, form);
    if (ability.cannot('delete', record)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    // Delete the record
    if (args.hardDelete) {
      return Record.findByIdAndDelete(record._id);
    } else {
      return Record.findByIdAndUpdate(
        record._id,
        { archived: true },
        { new: true }
      );
    }
  },
};
