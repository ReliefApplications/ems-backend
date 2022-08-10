import { GraphQLError } from 'graphql';
import { User } from '../../models';
import { UserType } from '../types';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve(parent, args, context) {
    const user = context.user;
    if (user) {
      return User.findById(user.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
