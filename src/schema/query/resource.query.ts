import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Return resource from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = user.ability;
      const resource = await Resource.findOne({ _id: args.id });

      if (ability.cannot('read', resource)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      return resource;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
