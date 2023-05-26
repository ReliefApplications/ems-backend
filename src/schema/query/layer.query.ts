import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { LayerType } from '../types';
import { Layer } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { userNotLogged } from '@utils/schema';

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
    const user = context.user;
    userNotLogged(user);
    // create ability object for all layers
    const ability: AppAbility = user.ability;
    if (ability.can('read', 'Layer')) {
      return Layer.findById(args.id);
    }

    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
