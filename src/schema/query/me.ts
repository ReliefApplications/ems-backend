import { GraphQLError } from 'graphql';
import { User } from '../../models';
import { UserType } from '../types';

export default {
  /*  Returns user from logged user id.
        Throw GraphQL error if not logged.
    */
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
