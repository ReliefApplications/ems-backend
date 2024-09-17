import { GraphQLNonNull, GraphQLError, GraphQLList, GraphQLID } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { User, Application, Channel, Notification, Role } from '@models';
import { UserType } from '../types';
import permissions from '@const/permissions';
import { validateEmail } from '@utils/validators';
import { sendAppInvitation, sendCreateAccountInvitation } from '@utils/user';
import config from 'config';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { UserArgs, UserInputType } from '@schema/inputs/user.input';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import pubsub from '../../server/pubsub';

/** Arguments for the addUsers mutation */
type AddUsersArgs = {
  users: UserArgs[];
  application?: string | Types.ObjectId;
};

/**
 * Add new users.
 */
export default {
  type: new GraphQLList(UserType),
  args: {
    users: { type: new GraphQLNonNull(new GraphQLList(UserInputType)) },
    application: { type: GraphQLID },
  },
  async resolve(parent, args: AddUsersArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;

      // Check permissions depending if it's an application's user or a global user
      if (ability.cannot('update', 'User')) {
        if (args.application) {
          const canUpdate = user.roles
            .filter((x) =>
              x.application ? x.application.equals(args.application) : false
            )
            .flatMap((x) => x.permissions)
            .some((x) => x.type === permissions.canSeeUsers);
          if (!canUpdate) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
        } else {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
      }
      if (args.users.filter((x) => !validateEmail(x.email)).length > 0) {
        throw new GraphQLError(
          context.i18next.t('common.errors.invalidEmailsInput')
        );
      }
      // Separate registered users and new users
      const invitedUsers: User[] = [];
      const existingUserUpdates: any[] = [];
      const registeredUsers = await User.find({
        username: { $in: args.users.map((x) => x.email) },
      }).select('username');
      const registeredEmails = registeredUsers.map((x) => x.username);

      const allRolesIDs = args.users.map((x) => x.roles).flat();
      const allRoles = await Role.find({ _id: { $in: allRolesIDs } });
      const allChannels = await Channel.find({ role: { $in: allRolesIDs } });

      const notifications: {
        notification: Notification;
        channel: Channel;
      }[] = [];

      // New users
      args.users
        .filter((x) => !registeredEmails.includes(x.email))
        .forEach((x) => {
          const newUser = new User();
          newUser.username = x.email;
          newUser.roles = x.roles;
          if (x.positionAttributes) {
            newUser.positionAttributes = x.positionAttributes;
          }
          // remove after 7 days if the user does not activate the account
          const date = new Date();
          date.setDate(date.getDate() + 7);
          newUser.deleteAt = date;
          invitedUsers.push(newUser);
        });

      // Registered users
      args.users
        .filter((x) => registeredEmails.includes(x.email))
        .forEach((x) => {
          const updateUser = {
            $addToSet: {
              roles: x.roles,
              positionAttributes: { $each: x?.positionAttributes || [] },
            },
          };
          existingUserUpdates.push({
            updateOne: {
              filter: { username: x.email },
              update: updateUser,
            },
          });
        });

      // Create notifications to role channel
      args.users.forEach((x) => {
        x.roles.forEach((r) => {
          const channel = allChannels.find((y) =>
            (y.role as Types.ObjectId).equals(r)
          );
          const role = allRoles.find((y) => y._id.equals(r));
          if (channel && role) {
            // @TODO: Localize this
            const notification = new Notification({
              action: `${user.name} a attribué le rôle d’${role.title} à ${x.email}`,
              content: user._id,
              channel: channel.id,
            });
            notifications.push({ notification, channel });
          }
        });
      });

      const application = args.application
        ? await Application.findById(args.application)
        : null;
      // Save the new users & send them an email invitation
      if (invitedUsers.length > 0) {
        await User.insertMany(invitedUsers);
        if (config.get('email.sendInvite')) {
          await sendCreateAccountInvitation(
            invitedUsers.map((x) => x.username),
            user,
            application
          );
        }
      }
      // Update the existing ones & send them an email notification
      if (registeredEmails.length > 0) {
        await User.bulkWrite(existingUserUpdates);
        if (application && config.get('email.sendInvite')) {
          await sendAppInvitation(registeredEmails, user, application);
        }
      }
      // Send notifications
      await Notification.insertMany(notifications.map((x) => x.notification));
      const publisher = await pubsub();
      notifications.forEach((x) =>
        publisher.publish(x.channel.id, { notification: x.notification })
      );

      // Return the full list of users
      return await User.find({
        username: { $in: args.users.map((x) => x.email) },
      }).populate({
        path: 'roles',
        model: 'Role',
        match: { application: { $eq: args.application } },
      });
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
