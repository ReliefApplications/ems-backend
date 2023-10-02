import { GraphQLList, GraphQLID, GraphQLError, GraphQLNonNull } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * List passed applications roles if user is logged, but only title and id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(RoleType),
  args: {
    applications: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const roles = await Role.find({
        application: { $in: args.applications },
      }).select('id title application');
      return roles;
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
