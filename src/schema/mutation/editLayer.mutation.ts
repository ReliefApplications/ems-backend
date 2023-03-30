import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import LayerInputType from '@schema/inputs/layer.input';

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
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const layer = await Layer.findById(args.id);

    if (ability.can('update', layer)) {
      // layer.name = args.layer.name;
      // layer.sublayers = args.layer.sublayers;
      // layer.visibility = args.layer.visibility;
      // layer.opacity = args.layer.opacity;
      // layer.layerDefinition = args.layer.layerDefinition;
      // layer.popupInfo = args.layer.popupInfo;
      return Layer.findByIdAndUpdate(args.id, args.layer);
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
