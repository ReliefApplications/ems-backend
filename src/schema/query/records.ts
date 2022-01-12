import { GraphQLError, GraphQLList } from 'graphql';
import { RecordType } from '../types';
import { Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /*  List all records available for the logged user.
      Throw GraphQL error if not logged.
  */
  type: new GraphQLList(RecordType),
  resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability: AppAbility = context.user.ability;
    if (ability.can('update', 'Form')) {
      return Record.accessibleBy(ability, 'read');
    } else {
      return Record.accessibleBy(ability, 'read').where({
        archived: { $ne: true },
      });
    }
  },
};
