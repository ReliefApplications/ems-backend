import { GraphQLBoolean, GraphQLID, GraphQLError, GraphQLList } from 'graphql';
import { Group } from '@models';
import { GroupType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

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
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const groups = await Group.find(accessibleBy(ability, 'read').Group);
      return groups;
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
