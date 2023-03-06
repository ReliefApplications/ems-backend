import { GraphQLNonNull, GraphQLError, GraphQLList, GraphQLID } from 'graphql';
import { AppAbility } from '@security/defineUserAbility';
import { User, Application } from '@models';
import { UserType } from '../types';
import permissions from '@const/permissions';
import UserInputType from '../inputs/user.input';
import { validateEmail } from '@utils/validators';
import { sendAppInvitation, sendCreateAccountInvitation } from '@utils/user';
import config from 'config';

/**
 * Add new users.
 */
export default {
  type: new GraphQLList(UserType),
  args: {
    users: { type: new GraphQLNonNull(new GraphQLList(UserInputType)) },
    application: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
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
    // New users
    args.users
      .filter((x) => !registeredEmails.includes(x.email))
      .forEach((x) => {
        const newUser = new User();
        newUser.username = x.email;
        newUser.roles = [x.role];
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
            roles: x.role,
            positionAttributes: { $each: x.positionAttributes },
          },
        };
        existingUserUpdates.push({
          updateOne: {
            filter: { username: x.email },
            update: updateUser,
          },
        });
      });

    const application = args.application
      ? await Application.findById(args.application)
      : null;
    // Save the new users
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
    //Update the existing ones
    if (registeredEmails.length > 0) {
      await User.bulkWrite(existingUserUpdates);
      if (application && config.get('email.sendInvite')) {
        await sendAppInvitation(registeredEmails, user, application);
      }
    }

    // Return the full list of users
    return User.find({
      username: { $in: args.users.map((x) => x.email) },
    }).populate({
      path: 'roles',
      match: { application: { $eq: args.application } },
    });
  },
};
