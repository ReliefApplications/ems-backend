import { GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Group } from '@models';
import { GroupType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';

/**
 * Get Query by ID.
 * Throw error if user is not logged, or does not have permission to see group, or group does not exist.
 */
export default {
  type: GroupType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'Group')) {
        try {
          const group = await Group.accessibleBy(ability, 'read').findOne({
            _id: args.id,
          });
          if (!group) {
            throw new GraphQLError(
              context.i18next.t('common.errors.dataNotFound')
            );
          }
          return group;
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
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
