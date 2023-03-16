import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLList,
} from 'graphql';
import permissions from '@const/permissions';
import { Role, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { validateEmail } from '@utils/validators';
import { PositionAttributeInputType } from '../inputs';
import { UserType } from '../types';

/**
 * Add new role to existing user.
 */
export default {
  type: new GraphQLList(UserType),
  args: {
    usernames: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
    role: { type: new GraphQLNonNull(GraphQLID) },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const role = await Role.findById(args.role).populate('application');
    if (!role)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    // Check permissions depending if it's an application's user or a global user
    if (ability.cannot('update', 'User')) {
      if (role.application) {
        const canUpdate = user.roles
          .filter((x) =>
            x.application ? x.application.equals(role.application) : false
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
    // Prevent wrong emails to be invited.
    if (args.usernames.filter((x) => !validateEmail(x)).length > 0) {
      throw new GraphQLError(
        context.i18next.t('common.errors.invalidEmailsInput')
      );
    }
    // Perform the add role to users
    const invitedUsers: User[] = [];
    // Separate registered users and new users
    const registeredUsers = await User.find({
      username: { $in: args.usernames },
    });
    const registeredEmails = registeredUsers.map((x) => x.username);
    args.usernames
      .filter((x) => !registeredEmails.includes(x))
      .forEach((x) => {
        const newUser = new User();
        newUser.username = x;
        newUser.roles = [args.role];
        if (args.positionAttributes) {
          newUser.positionAttributes = args.positionAttributes;
        }
        invitedUsers.push(newUser);
      });
    // Save the new users
    await User.insertMany(invitedUsers);
    if (registeredEmails.length > 0) {
      await User.updateMany(
        {
          username: {
            $in: registeredEmails,
          },
        },
        {
          $push: {
            roles: [args.role],
            positionAttributes: args.positionAttributes,
          },
        },
        { new: true }
      );
    }
    return User.find({ username: { $in: args.usernames } }).populate({
      path: 'roles',
      match: { application: { $eq: role.application } },
    });
  },
};
