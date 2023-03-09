import {
  GraphQLError,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLID,
} from 'graphql';
import { Layer } from '@models';
import { LayerType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Add new layer.
 * Throw an error if user not connected and not permission to create.
 */
export default {
  type: LayerType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    sublayers: { type: new GraphQLList(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;

    const layer = new Layer({
      name: args.name,
      sublayers: args.sublayers,
    });
    if (ability.can('create', layer)) {
      return layer.save();
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
