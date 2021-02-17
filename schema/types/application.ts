import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean } from "graphql";
import GraphQLJSON from "graphql-type-json";
import permissions from "../../const/permissions";
import { User, Page, Role, Channel } from "../../models";
import mongoose from 'mongoose';
import { UserType, PageType, RoleType, AccessType } from ".";
import { ChannelType } from "./channel";
import { SubscriptionType } from "./subscription";
import { AppAbility } from "../../security/defineAbilityFor";

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
                const ability: AppAbility = context.user.ability;
                return Role.accessibleBy(ability, 'read').where({ application: parent.id} );
            }
        },
        users: {
            type: new GraphQLList(UserType),
            async resolve(parent, args, context) {
                const user: User = context.user;
                const ability: AppAbility = context.user.ability;
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
                if (ability.can('read', 'User')) {
                    return await User.aggregate(aggregations);
                } else {
                    const canSee = user.roles.filter(x => x.application ? x.application.equals(parent.id) : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                    return canSee ? await User.aggregate(aggregations) : [];
                }
            }
        },
        usersCount: {
            type: GraphQLInt,
            async resolve(parent, args, context) {
                const user: User = context.user;
                const ability: AppAbility = context.user.ability;
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
                if (ability.can('read', 'User')) {
                    const users = await User.aggregate(aggregations);
                    return users.length;
                } else {
                    const canSee = user.roles.filter(x => x.application ? x.application.toString() === parent.id : false).flatMap(x => x.permissions).some(x => x.type === permissions.canSeeUsers);
                    const users = canSee ? await User.aggregate(aggregations) : [];
                    return users.length;
                }
            }
        },
        settings: {
            type: GraphQLJSON,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                if (ability.can('read', 'Application')) {
                    return parent.settings;
                } else {
                    return {};
                }
            }
        },
        channels: {
            type: new GraphQLList(ChannelType),
            resolve(parent, args, context) {
                return Channel.find({ application: parent._id });
            }
        },
        subscriptions: { type: new GraphQLList(SubscriptionType) },
        permissions: { type: AccessType },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', 'Application');
            }
        },
        canCreate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('create', 'Application');
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', 'Application');
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', 'Application');
            }
        }
    })
});