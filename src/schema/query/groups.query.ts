import { GraphQLBoolean, GraphQLID, GraphQLError, GraphQLList } from 'graphql';
import { Group } from '@models';
import { GroupType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Lists groups.
 * Throws error if user is not logged or does not have permission
 */
export default {
  type: new GraphQLList(GroupType),
  args: {
    all: { type: GraphQLBoolean },
    application: { type: GraphQLID },
  },
  resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = context.user.ability;
      return Group.accessibleBy(ability, 'read');
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
