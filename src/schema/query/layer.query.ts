import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@lib/logger';

/**
 * List all layers.
 * Throw GraphQL error if not logged and if not permission to access.
 */
export default {
  type: LayerType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      return await Layer.findById(args.id);
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
