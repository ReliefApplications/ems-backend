import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  User,
  Page,
  Role,
  Channel,
  Application,
  PositionAttributeCategory,
  PullJob,
} from '@models';
import mongoose from 'mongoose';
import {
  UserType,
  PageType,
  RoleType,
  AccessType,
  PositionAttributeCategoryType,
  PullJobType,
  TemplateType,
  DistributionListType,
  encodeCursor,
  CustomNotificationConnectionConnectionType,
  UserConnectionType,
} from '.';
import { ChannelType } from './channel.type';
import { SubscriptionType } from './subscription.type';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from './positionAttribute.type';
import { StatusEnumType } from '@const/enumTypes';
import { Connection, decodeCursor } from './pagination.type';
import extendAbilityForPage from '@security/extendAbilityForPage';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import {
  getAutoAssignedRoles,
  checkIfRoleIsAssignedToUser,
} from '@utils/user/getAutoAssignedRoles';
import { uniqBy, get } from 'lodash';

/** GraphQL application type definition */
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
      },
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
        return parent.lockedBy
          ? parent.lockedBy.toString() === context.user._id
          : false;
      },
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
      async resolve(parent: Application, args, context) {
        // Filter the pages based on the access given by app builders.
        const ability = await extendAbilityForPage(context.user, parent);
        const filter = Page.accessibleBy(ability, 'read').getFilter();
        const pages = await Page.aggregate([
          {
            $match: {
              $and: [filter, { _id: { $in: parent.pages } }],
            },
          },
          {
            $addFields: { __order: { $indexOfArray: [parent.pages, '$_id'] } },
          },
          { $sort: { __order: 1 } },
        ]);
        return pages.map((p) => new Page(p));
      },
    },
    roles: {
      type: new GraphQLList(RoleType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Role.accessibleBy(ability, 'read').where({
          application: parent.id,
        });
      },
    },
    userRoles: {
      type: new GraphQLList(RoleType),
      async resolve(parent, args, context) {
        const user = context.user;
        // First get roles manually assigned to user
        const manualRoles: Role[] = user.roles.filter(
          (x) => x.application && x.application.equals(parent.id)
        );

        // Then get roles automatically assigned to user
        const autoRoles = (await getAutoAssignedRoles(user)).filter(
          (x) => x.application && x.application.equals(parent.id)
        );

        // Filter out roles that are already assigned manually
        return uniqBy([...manualRoles, ...autoRoles], '_id');
      },
    },
    users: {
      type: UserConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        automated: { type: GraphQLBoolean },
      },
      async resolve(parent, args) {
        /** Available sort fields */
        const SORT_FIELDS = [
          {
            name: 'createdAt',
            cursorId: (node: any) => node.createdAt.getTime().toString(),
            cursorFilter: (cursor: any, sortOrder: string) => {
              const operator = sortOrder === 'asc' ? '$gt' : '$lt';
              return {
                createdAt: {
                  [operator]: decodeCursor(cursor),
                },
              };
            },
            sort: (sortOrder: string) => {
              return {
                createdAt: getSortOrder(sortOrder),
              };
            },
          },
        ];

        const first = get(args, 'first', 10);
        const sortField = SORT_FIELDS.find((x) => x.name === 'createdAt');

        const cursorFilters = args.afterCursor
          ? sortField.cursorFilter(args.afterCursor, 'asc')
          : {};

        let pipelines: any[] = [];
        const usersFacet: any[] = [
          {
            $match: cursorFilters,
          },
          {
            $limit: first,
          },
        ];

        const applicationAutoRoles = await Role.find({
          application: { $eq: parent._id },
          autoAssignment: { $exists: true, $ne: [] },
        });

        switch (args.automated) {
          case true: {
            const autoAssignedUsers = (
              await User.find({
                $and: [cursorFilters],
              }).sort(sortField.sort('asc'))
            )
              .filter((user) =>
                applicationAutoRoles.some((role) =>
                  checkIfRoleIsAssignedToUser(user, role)
                )
              )
              .map((x) => x._id);
            pipelines.push({
              $match: {
                _id: { $in: autoAssignedUsers },
              },
            });
            pipelines = pipelines.concat([
              // Left join
              {
                $lookup: {
                  from: 'roles',
                  localField: 'roles',
                  foreignField: '_id',
                  as: 'roles',
                },
              },
              // Replace the roles field with a filtered array, containing only roles that are part of the application.
              {
                $addFields: {
                  roles: {
                    $filter: {
                      input: '$roles',
                      as: 'role',
                      cond: {
                        $eq: [
                          '$$role.application',
                          mongoose.Types.ObjectId(parent.id),
                        ],
                      },
                    },
                  },
                },
              },
            ]);
            break;
          }
          case false: {
            pipelines = pipelines.concat([
              // Left join
              {
                $lookup: {
                  from: 'roles',
                  localField: 'roles',
                  foreignField: '_id',
                  as: 'roles',
                },
              },
              // Replace the roles field with a filtered array, containing only roles that are part of the application.
              {
                $addFields: {
                  roles: {
                    $filter: {
                      input: '$roles',
                      as: 'role',
                      cond: {
                        $eq: [
                          '$$role.application',
                          mongoose.Types.ObjectId(parent.id),
                        ],
                      },
                    },
                  },
                },
              },
              // Filter users that have at least one role in the application.
              {
                $match: { 'roles.0': { $exists: true } },
              },
            ]);
            break;
          }
          default: {
            const autoAssignedUsers = (
              await User.find({
                $and: [cursorFilters],
              }).sort(sortField.sort('asc'))
            )
              .filter((user) =>
                applicationAutoRoles.some((role) =>
                  checkIfRoleIsAssignedToUser(user, role)
                )
              )
              .map((x) => x._id);
            pipelines = pipelines.concat([
              // Left join
              {
                $lookup: {
                  from: 'roles',
                  localField: 'roles',
                  foreignField: '_id',
                  as: 'roles',
                },
              },
              // Replace the roles field with a filtered array, containing only roles that are part of the application.
              {
                $addFields: {
                  roles: {
                    $filter: {
                      input: '$roles',
                      as: 'role',
                      cond: {
                        $eq: [
                          '$$role.application',
                          mongoose.Types.ObjectId(parent.id),
                        ],
                      },
                    },
                  },
                },
              },
              // Filter users that have at least one role in the application.
              {
                $match: {
                  $or: [
                    { 'roles.0': { $exists: true } },
                    {
                      _id: { $in: autoAssignedUsers },
                    },
                  ],
                },
              },
            ]);
            break;
          }
        }
        pipelines.push({
          $facet: {
            users: usersFacet,
            totalCount: [
              {
                $count: 'count',
              },
            ],
          },
        });

        const aggregation = await User.aggregate(pipelines);

        let items: User[] = aggregation[0].users.map((u) => new User(u));
        const hasNextPage = items.length > first;
        if (hasNextPage) items = items.slice(0, items.length - 1);

        const totalCount: number = aggregation[0].totalCount[0]?.count || 0;

        const edges = items.map((r) => ({
          cursor: encodeCursor(sortField.toString()),
          node: r,
        }));

        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount,
        };
      },
    },
    settings: {
      type: GraphQLJSON,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent) ? parent.settings : null;
      },
    },
    channels: {
      type: new GraphQLList(ChannelType),
      resolve(parent) {
        return Channel.find({ application: parent._id });
      },
    },
    positionAttributeCategories: {
      type: new GraphQLList(PositionAttributeCategoryType),
      resolve(parent) {
        // TODO: protect
        return PositionAttributeCategory.find({ application: parent._id });
      },
    },
    positionAttributes: {
      type: new GraphQLList(PositionAttributeType),
      resolve(parent, args, context) {
        const user = context.user;
        return user.positionAttributes.filter((x) =>
          x.category.application.equals(parent.id)
        );
      },
    },
    subscriptions: { type: new GraphQLList(SubscriptionType) },
    pullJobs: {
      type: new GraphQLList(PullJobType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return PullJob.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.pullJobs);
      },
    },
    permissions: {
      type: AccessType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('update', parent) ? parent.permissions : null;
      },
    },
    canSee: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('read', new Application(parent));
      },
    },
    canUpdate: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return (
          ability.can('update', new Application(parent)) &&
          (!parent.lockedBy || parent.lockedBy.equals(context.user._id))
        );
      },
    },
    canDelete: {
      type: GraphQLBoolean,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return ability.can('delete', new Application(parent));
      },
    },
    templates: {
      type: new GraphQLList(TemplateType),
    },
    distributionLists: {
      type: new GraphQLList(DistributionListType),
    },
    customNotifications: {
      type: CustomNotificationConnectionConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        sortField: { type: GraphQLString },
        sortOrder: { type: GraphQLString },
        filter: { type: GraphQLJSON },
      },
      resolve(parent, args) {
        const DEFAULT_FIRST = 10;

        const operators = {
          gte: (field, value) => new Date(field) >= new Date(value),
          lte: (field, value) => new Date(field) <= new Date(value),
          eq: (field, value) => field === value,
        };

        let notifications = [...parent.customNotifications];

        if (args.filter) {
          notifications.filter((o) =>
            args.filter.every(({ field, operator, value }) =>
              operators[operator](o[field], value)
            )
          );
        }

        notifications =
          args.sortOrder === 'asc'
            ? notifications.sort((a, b) =>
                a[args.sortField] > b[args.sortField] ? 1 : -1
              )
            : notifications.sort((a, b) =>
                a[args.sortField] < b[args.sortField] ? 1 : -1
              );

        let start = 0;
        const first = args.first || DEFAULT_FIRST;
        const allEdges = notifications.map((x) => ({
          cursor: encodeCursor(x.id.toString()),
          node: x,
        }));

        const totalCount = allEdges.length;
        if (args.afterCursor) {
          start = allEdges.findIndex((x) => x.cursor === args.afterCursor) + 1;
        }
        let edges = allEdges.slice(start, start + first + 1);
        const hasNextPage = edges.length > first;
        if (hasNextPage) {
          edges = edges.slice(0, edges.length - 1);
        }
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount,
        };
      },
    },
  }),
});

/** GraphQL application connection type definition */
export const ApplicationConnectionType = Connection(ApplicationType);
