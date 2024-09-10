import { GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Group } from '@models';
import { GroupType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the group query */
type GroupArgs = {
  id: string | Types.ObjectId;
};
/**
 * Get Query by ID.
 * Throw error if user is not logged, or does not have permission to see group, or group does not exist.
 */
export default {
  type: GroupType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: GroupArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'Group')) {
        try {
          const group = await Group.findOne({
            _id: args.id,
            ...accessibleBy(ability, 'read').Group,
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
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
