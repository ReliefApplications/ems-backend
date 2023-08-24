import { GraphQLError, GraphQLList } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * List all layers.
 * Throw GraphQL error if not logged and if not permission to access.
 */
export default {
  type: new GraphQLList(LayerType),
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    // create ability object for all layers
    const ability: AppAbility = user.ability;
    if (ability.can('read', 'Layer')) {
      return Layer.find();
    }

    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
