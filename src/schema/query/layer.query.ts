import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';

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
      const user = context.user;

      // create ability object for all layers
      const ability: AppAbility = user.ability;
      if (ability.can('read', 'Layer')) {
        return await Layer.findById(args.id);
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
