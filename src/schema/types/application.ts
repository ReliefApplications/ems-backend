import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt, GraphQLBoolean, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { User, Page, Role, Channel, Application, PositionAttributeCategory, PullJob } from '../../models';
import mongoose from 'mongoose';
import { UserType, PageType, RoleType, AccessType, PositionAttributeCategoryType, PullJobType } from '.';
import { ChannelConnectionType } from './channel';
import { SubscriptionType } from './subscription';
import { AppAbility } from '../../security/defineAbilityFor';
import { PositionAttributeType } from './positionAttribute';
import { StatusEnumType } from '../../const/enumTypes';
import { Connection, encodeCursor, decodeCursor } from './pagination';
import errors from '../../const/errors';

const DEFAULT_FIRST = 10;

export const ApplicationType = new GraphQLObjectType({
    name: 'Application',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        description: { type: GraphQLString },
        status: { type: StatusEnumType },
        locked: {
            type: GraphQLBoolean,
            resolve(parent) {
                return !!parent.lockedBy;
            }
        },
        lockedBy: {
            type: UserType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return User.findById(parent.isLockedBy).accessibleBy(ability, 'read');
            },
        },
        lockedByUser: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                return parent.lockedBy ? parent.lockedBy.toString() === context.user.id : false;
            }
        },
        createdBy: {
            type: UserType,
            async resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return User.findById(parent.createdBy).accessibleBy(ability, 'read');
            },
        },
        pages: {
            type: new GraphQLList(PageType),
            async resolve(parent, args, context) {
                // Filter the pages based on the access given by app builders.
                const ability: AppAbility = context.user.ability;
                let filter = {};
                // If it's a BO user and it can see the parent application, it can see all the pages, if not we apply CASL permissions
                if (!(ability.can('read', parent) && context.user?.isAdmin)) {
                    filter = Page.accessibleBy(ability, 'read').getFilter();
                }
                const pages = await Page.aggregate([
                    {
                        '$match': {
                            $and: [
                                filter,
                                { '_id': { '$in': parent.pages } }
                            ]
                        }
                    },
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
        role: {
            type: RoleType,
            resolve(parent, args, context) {
                const user = context.user;
                return user.roles.find(x => x.application && x.application.equals(parent.id));
            }
        },
        users: {
            type: new GraphQLList(UserType),
            async resolve(parent, args, context) {
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
                    return User.aggregate(aggregations);
                } else {
                    return null;
                }
            }
        },
        usersCount: {
            type: GraphQLInt,
            async resolve(parent) {
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
                const users = await User.aggregate(aggregations);
                return users.length;
            }
        },
        settings: {
            type: GraphQLJSON,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.settings : null;
            }
        },
        channels: {
            type: new GraphQLList(ChannelConnectionType),
            async resolve(parent, args, context) {
                // Authentication check
                const user = context.user;
                if (!user) { throw new GraphQLError(errors.userNotLogged); }
        
                const ability: AppAbility = context.user.ability;
        
                const abilityFilters = Channel.accessibleBy(ability, 'read').where({ application: parent._id }).getFilter();
                const filters: any[] = [abilityFilters];
        
                const first = args.first || DEFAULT_FIRST;
                const afterCursor = args.afterCursor;
                const cursorFilters = afterCursor ? {
                        _id: {
                            $gt: decodeCursor(afterCursor),
                        }
                    } : {};
        
                let items: any[] = await Channel.find({ $and: [cursorFilters, ...filters] })
                    .limit(first + 1);
        
                const hasNextPage = items.length > first;
                if (hasNextPage) {
                    items = items.slice(0, items.length - 1);
                }
                const edges = items.map(r => ({
                    cursor: encodeCursor(r.id.toString()),
                    node: r,
                }));
                return {
                    pageInfo: {
                        hasNextPage,
                        startCursor: edges.length > 0 ? edges[0].cursor : null,
                        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
                    },
                    edges,
                    totalCount: await Channel.countDocuments({ $and: filters })
                };
            },
        },
        positionAttributeCategories: {
            type: new GraphQLList(PositionAttributeCategoryType),
            resolve(parent) {
                // TODO: protect
                return PositionAttributeCategory.find({ application: parent._id });
            }
        },
        positionAttributes: {
            type: new GraphQLList(PositionAttributeType),
            resolve(parent, args, context) {
                const user = context.user;
                return user.positionAttributes.filter(x => x.category.application.equals(parent.id));
            }
        },
        subscriptions: { type: new GraphQLList(SubscriptionType) },
        pullJobs: {
            type: new GraphQLList(PullJobType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return PullJob.accessibleBy(ability, 'read').where('_id').in(parent.pullJobs);
            }
        },
        permissions: {
            type: AccessType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', parent) ? parent.permissions : null;
            }
        },
        canSee: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('read', new Application(parent));
            }
        },
        canUpdate: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('update', new Application(parent)) && (!parent.lockedBy || parent.lockedBy.equals(context.user.id));
            }
        },
        canDelete: {
            type: GraphQLBoolean,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return ability.can('delete', new Application(parent));
            }
        }
    })
});

export const ApplicationConnectionType = Connection(ApplicationType);
