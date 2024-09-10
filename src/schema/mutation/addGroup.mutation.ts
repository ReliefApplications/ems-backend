import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Group } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { GroupType } from '../types';
import config from 'config';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addGroup mutation */
type AddGroupArgs = {
  title: string;
};

/**
 * Creates a new group.
 * Throws an error if not logged or authorized.
 */
export default {
  type: GroupType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: AddGroupArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      if (!config.get('user.groups.local')) {
        throw new GraphQLError(
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
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
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
