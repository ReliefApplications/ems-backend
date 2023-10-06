import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Dashboard } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { DashboardType } from '../types';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Create a new dashboard.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (ability.can('create', 'Dashboard')) {
        if (args.name !== '') {
          const dashboard = new Dashboard({
            name: args.name,
          });
          return dashboard.save();
        }
        throw new GraphQLError(
          context.i18next.t('mutations.dashboard.add.errors.invalidArguments')
        );
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
