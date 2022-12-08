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
} from '.';
import { ChannelType } from './channel.type';
import { SubscriptionType } from './subscription.type';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from './positionAttribute.type';
import { StatusEnumType } from '@const/enumTypes';
import { Connection } from './pagination.type';
import extendAbilityForPage from '@security/extendAbilityForPage';

/**
 * Build aggregation pipeline to get application users
 *
 * @param parent parent item
 * @returns user aggregation pipeline
 */
const getUserAggregationPipeline = (parent: any) => {
  return [
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
      type: new GraphQLList(UserType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        if (ability.can('read', 'User')) {
          const users = await User.aggregate(
            getUserAggregationPipeline(parent)
          );
          return users.map((u) => new User(u));
        } else {
          return null;
        }
      },
    },
    usersCount: {
      type: GraphQLInt,
      async resolve(parent) {
        const users = await User.aggregate(getUserAggregationPipeline(parent));
        return users.length;
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
      },
      resolve(parent, args) {
        const DEFAULT_FIRST = 10;
        let start = 0;
        const first = args.first || DEFAULT_FIRST;
        const allEdges = parent.customNotifications.map((x) => ({
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
