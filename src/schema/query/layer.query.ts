import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';

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
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // create ability object for all layers
    const ability: AppAbility = user.ability;
    if (ability.can('read', 'Layer')) {
      try {
        return Layer.findById(args.id);
      } catch (err) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
    }

    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
