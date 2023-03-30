import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import LayerInputType from '@schema/inputs/layerInputType.input';

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
      let layerData: any = {};

      if (!!args.layer.name) layerData.name = args.layer.name;
      if (!!args.layer.sublayers) layerData.sublayers = args.layer.sublayers;
      if (!!args.layer.visibility) layerData.visibility = args.layer.visibility;
      if (!!args.layer.opacity) layerData.opacity = args.layer.opacity;
      if (!!args.layer.layerDefinition)
        layerData.layerDefinition = args.layer.layerDefinition;
      if (!!args.layer.popupInfo) layerData.popupInfo = args.layer.popupInfo;

      await Layer.updateOne(
        {
          _id: args.id,
        },
        {
          $set: layerData,
        }
      );

      return await Layer.findOne({
        _id: args.id,
      });
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
