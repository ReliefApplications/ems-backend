import { GraphQLNonNull, GraphQLError, GraphQLList, GraphQLID } from 'graphql';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { User } from '../../models';
import { UserType } from '../types';
import validateEmail from '../../utils/validateEmail';
import permissions from '../../const/permissions';
import { UserInputType } from '../inputs/user.input';

export default {
    type: new GraphQLList(UserType),
    args: {
        users: { type: new GraphQLNonNull(new GraphQLList(UserInputType)) },
        application: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;

        // Check permissions depending if it's an application's user or a global user
        if (ability.cannot('update', 'User')) {
            if (args.application) {
                const canUpdate = user.roles.filter(x => x.application ? x.application.equals(args.application) : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                if (!canUpdate) {
                    throw new GraphQLError(errors.permissionNotGranted);
                }
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        }
        if (args.users.filter(x => !validateEmail(x.email)).length > 0) {
            throw new GraphQLError(errors.invalidEmailsInput);
        }
        // Separate registered users and new users
        const invitedUsers: User[] = [];
        const existingUserUpdates: any[] = [];
        const registeredUsers = await User.find({ 'username': { $in: args.users.map(x => x.email) } }).select('username');
        const registeredEmails = registeredUsers.map(x => x.username);
        // New users
        args.users.filter(x => !registeredEmails.includes(x.email)).forEach(x => {
            const newUser = new User();
            newUser.username = x.email;
            newUser.roles = x.roles
            if (x.attributes) {
                newUser.positionAttributes = x.attributes;
            }
            invitedUsers.push(newUser);
        });
        // Registered users
        args.users.filter(x => registeredEmails.includes(x.email)).forEach(x => {
            const updateUser = {
                $addToSet: { roles: { $each: x.roles }, positionAttributes: { $each: x.attributes } },
            }
            existingUserUpdates.push({
                updateOne: {
                    filter: { username: x.email },
                    update: updateUser
                }
            });
        });

        // Save the new users
        if (invitedUsers.length > 0) {
            await User.insertMany(invitedUsers);
        }
        //Update the existant ones
        if (registeredEmails.length > 0) {
            await User.bulkWrite(existingUserUpdates);
        }

        // Return the full list of users
        return User.find({ 'username': { $in: args.users.map(x => x.email) }}).populate({
            path: 'roles',
            match: { application: { $eq: args.application } }
        });
    }
}
