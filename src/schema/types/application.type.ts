import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLError,
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
  UserConnectionType,
} from '.';
import { ChannelType } from './channel.type';
import { SubscriptionType } from './subscription.type';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from './positionAttribute.type';
import { StatusEnumType } from '@const/enumTypes';
import { Connection, decodeCursor } from './pagination.type';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { getAutoAssignedUsers } from '@utils/user/getAutoAssignedRoles';

/**
 * Build aggregation pipeline to get application users
 *
 * @param parent parent item
 * @param paginationInfo pagination info
 * @param paginationInfo.first number of items to get
 * @param paginationInfo.afterCursor cursor to start from
 * @returns user aggregation pipeline
 */
const getUserAggregationPipeline = (
  parent: any,
  paginationInfo: { first: number | null; afterCursor?: string }
) => {
  const aggregation: any[] = [
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
              $eq: ['$$role.application', mongoose.Types.ObjectId(parent.id)],
            },
          },
        },
      },
    },
    // Filter users that have at least one role in the application.
    { $match: { 'roles.0': { $exists: true } } },
  ];

  const usersFacet: any[] = [];
  if (paginationInfo.afterCursor) {
    usersFacet.push({
      $match: {
        _id: {
          $gt: mongoose.Types.ObjectId(
            decodeCursor(paginationInfo.afterCursor)
          ),
        },
      },
    });
  }

  aggregation.push({
    $facet: {
      users: paginationInfo.first
        ? usersFacet.concat([{ $limit: paginationInfo.first + 1 }])
        : usersFacet,
      totalCount: [
        {
          $count: 'count',
        },
      ],
    },
  });

  return aggregation;
};

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
    role: {
      type: RoleType,
      resolve(parent, args, context) {
        const user = context.user;
        return user.roles.find(
          (x) => x.application && x.application.equals(parent.id)
        );
      },
    },
    users: {
      type: UserConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
      },
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (args.afterCursor) console.log(decodeCursor(args.afterCursor));

        const DEFAULT_FIRST = 10;

        const first = args.first || DEFAULT_FIRST;

        if (ability.cannot('read', 'User')) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }

        const aggregation = await User.aggregate(
          getUserAggregationPipeline(parent, {
            first,
            afterCursor: args.afterCursor,
          })
        );

        let users: User[] = aggregation[0].users.map((u) => new User(u));
        const hasNextPage = users.length > first;
        if (hasNextPage) users = users.slice(0, users.length - 1);

        const totalCount: number = aggregation[0].totalCount[0]?.count || 0;

        const edges = users.map((r) => ({
          cursor: encodeCursor(r.id.toString()),
          node: r,
        }));

        return {
          totalCount,
          edges,
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
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
    autoAssignedUsers: {
      type: UserConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
      },
      async resolve(parent, args) {
        const DEFAULT_FIRST = 10;
        const first = args.first || DEFAULT_FIRST;

        let roles = await Role.find({
          application: parent.id,
        });
        const aggregation = await User.aggregate(
          getUserAggregationPipeline(parent, {
            first: null,
          })
        );

        const users: User[] = aggregation[0].users.map((u) => new User(u));

        roles = roles.filter((role) => role.autoAssignment.length > 0);

        const items: User[] = [];
        const usernameArr = [];
        for await (const role of roles) {
          for await (const user of users) {
            const isAutoAssign = await getAutoAssignedUsers(user, role);
            if (isAutoAssign) {
              if (usernameArr.indexOf(user.username) == -1) {
                usernameArr.push(user.username);
                items.push(user);
              }
            }
          }
        }

        let start = 0;
        const allEdges = items.map((x) => ({
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
