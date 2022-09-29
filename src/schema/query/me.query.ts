import { GraphQLError } from 'graphql';
import {
  fetchUserAttributesFromService,
  fetchUserGroupsFromService,
} from '../../server/fetchGroups';
import { User } from '../../models';
import { UserType } from '../types';
import config from 'config';
import { logger } from '../../services/logger.service';

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
          Promise.all([
            fetchUserGroupsFromService(user),
            fetchUserAttributesFromService(user),
          ]);
        } catch (err) {
          logger.error(err);
        }
      }
      return User.findById(user.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
  },
};
