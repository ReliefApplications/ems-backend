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
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = user.ability;
      const layer = await Layer.findById(args.id);

      if (ability.can('update', layer)) {
        if (args.parent) {
          //remove current layer as sublayer from exist layer
          const layers = await Layer.find({
            sublayers: { $elemMatch: { $eq: args.id } },
          });
          for await (const layerData of layers) {
            await Layer.updateOne(
              { _id: layerData._id },
              { $pull: { sublayers: args.id } }
            );
          }

          //add current layer in ther parent layer
          await Layer.updateOne(
            { _id: args.parent },
            { $push: { sublayers: args.id } }
          );
        }

        layer.name = args.name;
        layer.sublayers = args.sublayers;
        return layer.save();
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    } catch (err) {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }
  },
};
