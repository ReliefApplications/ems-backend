import {
  GraphQLError,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
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
    name: { type: new GraphQLNonNull(GraphQLString) },
    sublayers: { type: GraphQLJSON },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const layer = await Layer.findById(args.id);

    if (ability.can('update', layer)) {
      layer.name = args.name;
      layer.sublayers = args.sublayers;
      return layer.save();
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
