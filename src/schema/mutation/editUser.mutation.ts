import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import permissions from '@const/permissions';
import { Channel, Role, User, Notification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { UserType } from '../types';
import { PositionAttributeInputType, PositionAttributeArgs } from '../inputs';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import pubsub from '../../server/pubsub';

/** Arguments for the editUser mutation */
type EditUserArgs = {
  id: string | Types.ObjectId;
  roles: string[] | Types.ObjectId[];
  groups: string[] | Types.ObjectId[];
  application?: string | Types.ObjectId;
  positionAttributes?: PositionAttributeArgs[];
};
/**
 * Edits an user's roles and groups, providing its id and the list of roles/groups.
 * Throws an error if not logged or authorized.
 */
export default {
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    roles: { type: new GraphQLList(GraphQLID) },
    groups: { type: new GraphQLList(GraphQLID) },
    application: { type: GraphQLID },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  },
  async resolve(parent, args: EditUserArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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
          model: 'Role',
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
          const editedUser = await User.findById(args.id).populate({
            path: 'roles',
            model: 'Role',
          });

          // Need to check which roles were added and which were removed
          // to send notifications to the respective channels
          const originalBackOfficeRoles = editedUser.roles
            .filter((r) => !r.application)
            .map((r) => r._id);

          // Roles not found in the original user's roles
          const addedRoles = (roles as any).filter(
            (r) => !originalBackOfficeRoles.find((x) => x.equals(r))
          );

          // Roles not found in the new roles list
          const removedRoles = originalBackOfficeRoles.filter(
            (r) => !(roles as any).find((x) => r.equals(x))
          );

          // Join FO and BO roles to be updated
          roles = editedUser.roles
            ?.filter((r) => !!r.application)
            .map((x) => x._id)
            .concat(roles);
          Object.assign(update, { roles: roles });

          // Get all roles and channels to send notifications to
          const allRoles = await Role.find({
            _id: { $in: addedRoles.concat(removedRoles) },
          });
          const allChannels = await Channel.find({
            role: { $in: addedRoles.concat(removedRoles) },
          });

          const notifications: {
            notification: Notification;
            channel: Channel;
          }[] = [];

          addedRoles.forEach((r) => {
            const role = allRoles.find((x) => x._id.equals(r));
            const channel = allChannels.find((x) => {
              const roleID: Types.ObjectId =
                x.role instanceof Types.ObjectId ? x.role : x.role._id;
              return roleID && roleID.equals(r);
            });
            if (role && channel) {
              // Create notifications to role channel
              const notification = new Notification({
                action: `New ${role.title} added: ${editedUser.username}`,
                content: user._id,
                channel: channel.id,
              });
              notifications.push({ notification, channel });
            }
          });

          removedRoles.forEach((r) => {
            const role = allRoles.find((x) => x._id.equals(r));
            const channel = allChannels.find((x) => x.role.equals(r));
            if (role && channel) {
              // Create notifications to role channel
              const notification = new Notification({
                action: `${role.title} removed: ${editedUser.username}`,
                content: user._id,
                channel: channel.id,
              });
              notifications.push({ notification, channel });
            }
          });

          if (notifications.length > 0) {
            await Notification.insertMany(
              notifications.map((x) => x.notification)
            );

            const publisher = await pubsub();
            notifications.forEach((x) => {
              publisher.publish(x.channel.id, { notification: x.notification });
            });
          }
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
