import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLList,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import permissions from '@const/permissions';
import { Channel, Role, User, Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { UserType } from '../types';
import { PositionAttributeInputType } from '../inputs';
import { logger } from '@services/logger.service';
import pubsub from '@server/pubsub';

/**
 * Edits an user's roles and groups, providing its id and the list of roles/groups.
 * Throws an error if not logged or authorized.
 */
export default {
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    roles: { type: new GraphQLList(GraphQLID) },
    groups: { type: new GraphQLList(GraphQLID) },
    application: { type: GraphQLID },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = context.user.ability;
      let roles = args.roles;
      if (args.application) {
        if (ability.cannot('update', 'User')) {
          // Check applications permissions if we don't have the global one
          const canUpdate = user.roles.some(
            (x) =>
              x.application &&
              x.application.equals(args.application) &&
              x.permissions.some(
                (y) => y.type === permissions.canSeeUsers && !y.global
              )
          );
          if (!canUpdate) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
        }
        const nonAppRoles = await User.findById(args.id).populate({
          path: 'roles',
          match: { application: { $ne: args.application } }, // Only returns roles not attached to the application
        });
        roles = nonAppRoles.roles.map((x) => x._id).concat(roles);
        const update = {
          roles,
        };
        if (args.positionAttributes) {
          const positionAttributes = args.positionAttributes.filter(
            (element) => element.value.length > 0
          );
          Object.assign(update, {
            positionAttributes,
          });
        }
        if (Object.keys(update).length < 1) {
          throw new GraphQLError(
            context.i18next.t('mutations.user.edit.errors.invalidArguments')
          );
        }
        return await User.findByIdAndUpdate(args.id, update, {
          new: true,
        });
      } else {
        if (ability.cannot('update', 'User')) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const update = {};
        if (args.roles) {
          const appRoles = await User.findById(args.id).populate({
            path: 'roles',
            match: { application: { $ne: null } }, // Returns roles attached to any application
          });
          roles = appRoles.roles.map((x) => x._id).concat(roles);
          Object.assign(update, { roles: roles });
          const userName = (await User.findById(args.id)).name;
          const roleTitles = (
            await Promise.all(
              roles.map(async (role) => {
                const roleDocument = await Role.findById(role);
                return roleDocument.title;
              })
            )
          ).join(', ');
          roles.forEach(async (role) => {
            const channel = await Channel.findOne({ role: role });
            if (channel) {
              const notification = new Notification({
                // Sending notifications when an user's back-office roles are changed for all roles involved
                action: `${user.name} has changed the roles assigned to ${userName}: ${roleTitles}`,
                content: user,
                channel: channel.id,
              });
              await notification.save();
              const publisher = await pubsub();
              publisher.publish(channel.id, { notification });
            }
          });
        }
        if (args.groups) {
          Object.assign(update, { groups: args.groups });
        }
        if (Object.keys(update).length < 1) {
          throw new GraphQLError(
            context.i18next.t('mutations.user.edit.errors.invalidArguments')
          );
        }
        return await User.findByIdAndUpdate(args.id, update, { new: true });
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
