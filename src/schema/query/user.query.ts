import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { User } from '@models';
import { UserType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Get User by ID.
 * Throw an error if logged user does not have permissions to see user, there is no logged user, or ID is invalid.
 */
export default {
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;

      if (ability.can('read', 'User')) {
        try {
          const u = await User.findById(args.id)
            .populate({ path: 'roles', model: 'Role' })
            .populate({ path: 'groups', model: 'Group' });
          return u;
        } catch {
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
