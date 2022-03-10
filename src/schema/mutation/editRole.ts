import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import { Role } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { RoleType } from '../types';

export default {
  /*  Edits a role's admin permissions, providing its id and the list of admin permissions.
        Throws an error if not logged or authorized.
    */
  type: RoleType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    permissions: { type: new GraphQLList(GraphQLID) },
    channels: { type: new GraphQLList(GraphQLID) },
    title: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    if (!args || (!args.permissions && !args.channels))
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditRolesArguments')
      );
    const update = {};
    Object.assign(
      update,
      args.permissions && { permissions: args.permissions },
      args.channels && { channels: args.channels },
      args.title && { title: args.title }
    );
    const filters = Role.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    const role = await Role.findOneAndUpdate(filters, update, { new: true });
    if (!role) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return role;
  },
};
