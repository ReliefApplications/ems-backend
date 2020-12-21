import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import permissions from "../../const/permissions";
import { User, Page, Role, Channel } from "../../models";
import checkPermission from "../../utils/checkPermission";
import mongoose from 'mongoose';
import { UserType, PageType, RoleType, AccessType } from ".";
import { ChannelType } from "./channel";

export const ApplicationType = new GraphQLObjectType({
    name: 'Application',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        description: { type: GraphQLString },
        status: { type: GraphQLString },
        createdBy: {
            type: UserType,
            resolve(parent, args) {
                return User.findById(parent.createdBy);
            },
        },
        pages: {
            type: new GraphQLList(PageType),
            async resolve(parent, args) {
                const pages = await Page.aggregate([
                    { '$match': { '_id': { '$in': parent.pages } } },
                    { '$addFields': { '__order': { '$indexOfArray': [parent.pages, '$_id'] } } },
                    { '$sort': { '__order': 1 } }
                ]);
                return pages;
            }
        },
        roles: {
            type: new GraphQLList(RoleType),
            resolve(parent, args, context) {
                const user: User = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return Role.find({ application: parent.id });
                } else {
                    const canSee = user.roles.filter(x => x.application.toString() === parent.id).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeRoles);
                    return canSee ? Role.find({ application: parent.id }) : [];
                }
            }
        },
        users: {
            type: new GraphQLList(UserType),
            async resolve(parent, args, context) {
                const user: User = context.user;
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
                    // Replace the roles field with a filtered array, containing only roles that are part of the application.
                    {
                        $addFields: {
                            roles: {
                                $filter: {
                                    input: '$roles',
                                    as: 'role',
                                    cond: { $eq: ['$$role.application', mongoose.Types.ObjectId(parent.id)] }
                                }
                            }
                        }
                    },
                    // Filter users that have at least one role in the application.
                    { $match: { 'roles.0': { $exists: true } } }
                ];
                if (checkPermission(user, permissions.canManageApplications)) {
                    return await User.aggregate(aggregations);
                } else {
                    const canSee = user.roles.filter(x => x.application.toString() === parent.id).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                    return canSee ? await User.aggregate(aggregations) : [];
                }
            }
        },
        usersCount: {
            type: GraphQLInt,
            async resolve(parent, args, context) {
                const user: User = context.user;
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
                    // Replace the roles field with a filtered array, containing only roles that are part of the application.
                    {
                        $addFields: {
                            roles: {
                                $filter: {
                                    input: '$roles',
                                    as: 'role',
                                    cond: { $eq: ['$$role.application', mongoose.Types.ObjectId(parent.id)] }
                                }
                            }
                        }
                    },
                    // Filter users that have at least one role in the application.
                    { $match: { 'roles.0': { $exists: true } } }
                ];
                if (checkPermission(user, permissions.canManageApplications)) {
                    const users = await User.aggregate(aggregations);
                    return users.length;
                } else {
                    const canSee = user.roles.filter(x => x.application.toString() === parent.id).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                    const users = canSee ? await User.aggregate(aggregations) : [];
                    return users.length;
                }
            }
        },
        settings: {
            type: GraphQLJSON,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return parent.settings;
                } else {
                    return {};
                }
            }
        },
        channels: {
            type: ChannelType,
            resolve(parent, args, context) {
                return Channel.find({ application: parent._id });
            }
        },
        permissions: { type: AccessType },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canSeeApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canSee.some(x => roles.includes(x));
                }
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canCreate.some(x => roles.includes(x));
                }
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canUpdate.some(x => roles.includes(x));
                }
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const user = context.user;
                if (checkPermission(user, permissions.canManageApplications)) {
                    return true;
                } else {
                    const roles = user.roles.map(x => x._id);
                    return parent.permissions.canDelete.some(x => roles.includes(x));
                }
            }
        }
    })
});