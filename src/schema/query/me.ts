import { GraphQLError } from 'graphql';
import { fetchUserGroupsFromService } from '../../server/fetchGroups';
import { User } from '../../models';
import { UserType } from '../types';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    const user = context.user;
    if (user) {
      await fetchUserGroupsFromService(user);
      return User.findById(user.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
