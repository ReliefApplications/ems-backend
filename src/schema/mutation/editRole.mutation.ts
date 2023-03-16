import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLError,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { get, has } from 'lodash';
import { Role } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';

/**
 * Edit a role's admin permissions, providing its id and the list of admin permissions.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RoleType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    permissions: { type: new GraphQLList(GraphQLID) },
    channels: { type: new GraphQLList(GraphQLID) },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    autoAssignment: {
      type: GraphQLJSON,
    },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const autoAssignmentUpdate: any = {};
    if (args.autoAssignment) {
      if (has(args.autoAssignment, 'add')) {
        Object.assign(autoAssignmentUpdate, {
          $addToSet: {
            autoAssignment: get(args.autoAssignment, 'add'),
          },
        });
      }
      if (has(args.autoAssignment, 'remove')) {
        Object.assign(autoAssignmentUpdate, {
          $pull: {
            autoAssignment: get(args.autoAssignment, 'remove'),
          },
        });
      }
    }

    const ability: AppAbility = context.user.ability;
    const update = {};
    Object.assign(
      update,
      args.permissions && { permissions: args.permissions },
      args.channels && { channels: args.channels },
      args.title && { title: args.title },
      args.description && { description: args.description },
      autoAssignmentUpdate.$pull && { $pull: autoAssignmentUpdate.$pull }
    );

    const filters = Role.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();

    // doing a separate update to avoid the following error:
    // Updating the path 'x' would create a conflict at 'x'
    if (autoAssignmentUpdate.$addToSet) {
      await Role.findOneAndUpdate(filters, {
        $addToSet: autoAssignmentUpdate.$addToSet,
      });
    }

    await Role.findOneAndUpdate(filters, update, { new: true });
    const role = await Role.findOneAndUpdate(
      filters,
      { $pull: { autoAssignment: null } },
      { new: true }
    );
    if (!role) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    return role;
  },
};
