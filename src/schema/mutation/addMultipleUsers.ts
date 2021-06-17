import { GraphQLNonNull, GraphQLError, GraphQLList } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import { Role, User } from '../../models';
import { UserType } from '../types';
import validateEmail from '../../utils/validateEmail';
import permissions from '../../const/permissions';

export default {
    type: new GraphQLList(UserType),
    args: {
        users: { type: new GraphQLNonNull(GraphQLJSON) },
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;

        const role = await Role.findById(args.users[0].role[0].id).populate('application');
        // Check permissions depending if it's an application's user or a global user
        if (ability.cannot('update', 'User')) {
            if (role.application) {
                const canUpdate = user.roles.filter(x => x.application ? x.application.equals(role.application) : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
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
        // Perform the add role to users
        const invitedUsers: User[] = [];
        const existingUsers: any[] = [];
        // Separate registered users and new users
        const registeredUsers = await User.find({ 'username': { $in: args.users.map(x => x.email) } });
        const registeredEmails = registeredUsers.map(x => x.username);
        args.users.filter(x => !registeredEmails.includes(x.email)).forEach(x => {
            const newUser = new User();
            newUser.username = x.email;
            newUser.roles = [x.role[0].id]
            if (x.categories) {
                newUser.positionAttributes = x.categories.map(k => {
                    return {
                        value: k.value,
                        category: k.id
                    }
                });
            }
            invitedUsers.push(newUser);
        });
        args.users.filter(x => registeredEmails.includes(x.email)).forEach(x => {
            const updateUser = {
                username: '',
                roles: [],
                positionAttributes: [],
            }
            updateUser.username = x.email;
            updateUser.roles = [x.role[0].id]
            if (x.categories) {
                updateUser.positionAttributes = x.categories.map(k => {
                    return {
                        value: k.value,
                        category: k.id
                    }
                });
            }
            existingUsers.push(updateUser);
        });
        // Save the new users
        await User.insertMany(invitedUsers);

                // TODO // 
        //Update the existant ones
        if (registeredEmails.length > 0) {
            await User.bulkWrite([
                { updateMany : 
                    {
                        'filter': { $in: registeredEmails },
                        'update': { $in: existingUsers }
                    }
            }
            ])
        }
        return User.find({ 'username': { $in: args.users.map(x => x.email) }}).populate({
            path: 'roles',
            match: { application: { $eq: role.application } }
        });
    }
}
