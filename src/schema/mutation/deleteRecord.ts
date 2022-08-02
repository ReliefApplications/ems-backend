import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '../../models';
import { RecordType } from '../types';
import { AppAbility } from '../../security/defineUserAbilities';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';
import { getFormPermissionFilter } from '../../utils/filter';

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
    // check ability in global roles and app roles for this form
    let canDelete = ability.can('delete', 'Record');
    // Check second layer of permissions
    if (!canDelete) {
      const permissionFilters = getFormPermissionFilter(
        user,
        form,
        'canDeleteRecords'
      );
      canDelete =
        permissionFilters.length > 0
          ? await Record.exists({
              $and: [{ _id: args.id }, { $or: permissionFilters }],
            })
          : !form.permissions.canDeleteRecords.length;
    }
    if (!canDelete) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // Delete the record
    if (args.hardDelete) {
      if (ability.can('delete', 'Record')) {
        return Record.findByIdAndDelete(args.id);
      } else {
        throw new GraphQLError(
          context.i18next.t('errors.permissionNotGranted')
        );
      }
    } else {
      return Record.findByIdAndUpdate(
        args.id,
        { archived: true },
        { new: true }
      );
    }
  },
};
