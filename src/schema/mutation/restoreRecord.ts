import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Record } from '../../models';
import { RecordType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import errors from '../../const/errors';

export default {
  /*  Restore, if user has permission to update associated form / resource.
        Throw an error if not logged or authorized.
    */
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = context.user.ability;
    // Check ability
    if (ability.can('update', 'Record')) {
      return Record.findByIdAndUpdate(
        args.id,
        { archived: false },
        { new: true }
      );
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
