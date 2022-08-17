import { GraphQLError } from 'graphql';
import { fetchUserGroupsFromService } from '../../server/fetchGroups';
import { User } from '../../models';
import { UserType } from '../types';
import config from 'config';

/**
 * Return user from logged user id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: UserType,
  resolve: async (parent, args, context) => {
    const user = context.user;
    if (user) {
      // Try to contact external service to fill user data
      if (!config.get('groups.manualCreation')) {
        try {
          await fetchUserGroupsFromService(user);
        } catch (err) {
          console.error(err);
        }
      }
      return User.findById(user.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
