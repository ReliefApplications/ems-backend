import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
} from 'graphql';
import { User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Delete a user.
 * Throw an error if not logged or authorized.
 */
export default {
  type: GraphQLInt,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = user.ability;
      if (ability.can('delete', 'User')) {
        const result = await User.deleteMany({ _id: { $in: args.ids } });
        return result.deletedCount;
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
