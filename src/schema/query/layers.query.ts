import { GraphQLError, GraphQLList } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * List all layers.
 * Throw GraphQL error if not logged and if not permission to access.
 */
export default {
  type: new GraphQLList(LayerType),
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // create ability object for all layers
    let ability: AppAbility = user.ability;
    if (ability.can('read', 'Layer')) {
      return Layer.find();
    }

    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
