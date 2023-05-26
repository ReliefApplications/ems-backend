import { GraphQLError, GraphQLNonNull, GraphQLID } from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { userNotLogged } from '@utils/schema';

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
    userNotLogged(user);
    const layer = await Layer.findById(args.id);
    const ability: AppAbility = user.ability;

    if (ability.can('delete', layer)) {
      // delete layer
      await layer.deleteOne();
      return layer;
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
