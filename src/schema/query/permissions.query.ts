import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import { Permission } from '@models';
import { PermissionType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the permissions query */
type PermissionsArgs = {
  application?: boolean;
};

/**
 * List permissions.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PermissionType),
  args: {
    application: { type: GraphQLBoolean },
  },
  async resolve(parent, args: PermissionsArgs, context: Context) {
    // Check that user is authenticated
    graphQLAuthCheck(context);
    try {
      if (args.application) {
        // Query application scoped permissions
        const permissions = await Permission.find({ global: false });
        return permissions;
      }
      // Query admin permissions
      const permissions = await Permission.find({ global: true });
      return permissions;
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
