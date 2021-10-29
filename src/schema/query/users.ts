import { GraphQLList, GraphQLError, GraphQLID } from 'graphql';
import errors from '../../const/errors';
import { User } from '../../models';
import { UserType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';

export default {
    /*  List back-office users if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: new GraphQLList(UserType),
    args: {
        applications: { type: GraphQLList(GraphQLID) }
    },
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        if (!args.applications) {
            if (ability.can('read', 'User')) {
                return User.find({}).populate({
                    path: 'roles',
                    match: { application: { $eq: null } }
                });
            } else {
                throw new GraphQLError(errors.permissionNotGranted);
            }
        } else {
            const aggregations = [
                // Left join
                {
                    $lookup: {
                        from: 'roles',
                        localField: 'roles',
                        foreignField: '_id',
                        as: 'roles'
                    }
                },
                // Replace the roles field with a filtered array, containing only roles that are part of the application(s).
                {
                    $addFields: {
                        roles: {
                            $filter: {
                                input: '$roles',
                                as: 'role',
                                cond: { $in: ['$$role.application', args.applications.map(x => mongoose.Types.ObjectId(x))] }
                            }
                        }
                    }
                },
                // Filter users that have at least one role in the application(s).
                { $match: { 'roles.0': { $exists: true } } }
            ];
            // TODO check ability
            return User.aggregate(aggregations);    
        }
    }
}
