import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '../../models';
import { RecordType } from '../types';
import { AppAbility } from '../../security/defineUserAbility';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';

export default {
  /*  Delete a record, if user has permission to update associated form / resource.
        Throw an error if not logged or authorized.
    */
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // Get the record and form objects
    const record = await Record.findById(args.id);
    const form = await Form.findById(record.form);

    // Check the ability
    const ability: AppAbility = defineUserAbilitiesOnForm(user, form);
    if (ability.cannot('delete', record)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // Delete the record
    if (args.hardDelete) {
      return record.deleteOne();
    } else {
      return record.update({ archived: true }, { new: true });
    }
  },
};
