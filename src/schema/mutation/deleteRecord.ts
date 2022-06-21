import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '../../models';
import { RecordType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import errors from '../../const/errors';
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
      throw new GraphQLError(errors.userNotLogged);
    }
    const record = await Record.findById(args.id);
    const ability: AppAbility = context.user.ability;
    let canDelete = false;
    // Check ability
    if (ability.can('delete', 'Record')) {
      canDelete = true;
      // Check second layer of permissions
    } else {
      const form = await Form.findById(record.form);
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
    if (canDelete) {
      if (args.hardDelete) {
        if (ability.can('delete', 'Record')) {
          return Record.findByIdAndDelete(args.id);
        } else {
          throw new GraphQLError(errors.permissionNotGranted);
        }
      } else {
        return Record.findByIdAndUpdate(
          args.id,
          { archived: true },
          { new: true }
        );
      }
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
