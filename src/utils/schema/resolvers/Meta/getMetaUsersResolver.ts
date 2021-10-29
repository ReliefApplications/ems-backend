import { User } from '../../../../models/user';
import mongoose from 'mongoose';

/**
 * Return users meta resolver.
 * @param field field definition.
 * @returns Users resolver.
 */
 const getMetaUsersResolver = async (field: any) => {
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
                        cond: { $in: ['$$role.application', field.applications.map(x => mongoose.Types.ObjectId(x))] }
                    }
                }
            }
        },
        // Filter users that have at least one role in the application(s).
        { $match: { 'roles.0': { $exists: true } } }
    ];
    // TODO check ability
    const users = await User.aggregate(aggregations);
    return Object.assign(field, {
        choices: users.map(x => {
            return {
                text: x.username,
                value: x._id
            };
        })
        });
}

export default getMetaUsersResolver;
