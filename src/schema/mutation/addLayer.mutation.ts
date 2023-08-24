import { GraphQLError, GraphQLNonNull } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import LayerInputType from '@schema/inputs/layer.input';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Add new layer.
 * Throw an error if user not connected and not permission to create.
 */
export default {
  type: LayerType,
  args: {
    layer: { type: new GraphQLNonNull(LayerInputType) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    const ability: AppAbility = user.ability;

    const layer = new Layer(args.layer);
    if (ability.can('create', layer)) {
      return layer.save();
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
