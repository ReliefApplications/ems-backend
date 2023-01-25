import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Edit new layer.
 * Throw an error if user not connected and not permission to create.
 */
export default {
  type: LayerType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    let layer = await Layer.findById(args.id);
    const ability: AppAbility = user.ability;

    if (ability.can('delete', layer)) {
      const layers = await Layer.find({
        sublayers: { $elemMatch: { $eq: args.id } },
      });
      for await (const layerData of layers) {
        const index = layerData.sublayers.indexOf(args.id);
        layerData.sublayers.splice(index, 1);
        await layerData.save();
      }

      // delete layer
      await layer.deleteOne();
      return layer;
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
