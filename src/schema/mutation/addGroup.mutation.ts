import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GroupType } from '../types';
import config from 'config';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Creates a new group.
 * Throws an error if not logged or authorized.
 */
export default {
  type: GroupType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      if (!config.get('user.groups.local')) {
        throw new GraphQLHandlingError(
          context.i18next.t('mutations.group.add.errors.manualCreationDisabled')
        );
      }

      const ability: AppAbility = user.ability;

      const group = new Group({
        title: args.title,
      });
      if (ability.can('create', group)) {
        return await group.save();
      }
      throw new GraphQLHandlingError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
