import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import LayerInputType from '@schema/inputs/layer.input';
import { userNotLogged } from '@utils/schema';

/**
 * Edit new layer.
 * Throw an error if user not connected and not permission to create.
 */
export default {
  type: LayerType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    layer: { type: new GraphQLNonNull(LayerInputType) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    if (args.type !== 'GroupLayer' && args.sublayers) {
      // todo(translate)
      throw new GraphQLError('Only group layers can have sublayers');
    }

    const ability: AppAbility = user.ability;
    const layer = await Layer.findById(args.id);

    if (ability.can('update', layer)) {
      return Layer.findByIdAndUpdate(args.id, args.layer);
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
