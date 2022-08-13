import { GraphQLError } from 'graphql';
import {
  fetchUserAttributesFromService,
  fetchUserGroupsFromService,
} from '../../server/fetchGroups';
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
      if (config.get('groups.manualCreation')) {
        await fetchUserGroupsFromService(user);
        await fetchUserAttributesFromService(user);
      }
      return User.findById(user.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
