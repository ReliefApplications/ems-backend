import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { Group } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { GroupType } from '../types';

/**
 * Creates a new group.
 * Throws an error if not logged or authorized.
 */
export default {
  type: GroupType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const now = new Date();

    const group = new Group({
      title: args.title,
      createdAt: now,
      modifiedAt: now,
    });
    if (ability.can('create', group)) {
      return group.save();
    }
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
