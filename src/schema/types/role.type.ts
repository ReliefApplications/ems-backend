import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import { Permission, User, Application, Channel } from '@models';
import {
  ApplicationType,
  PermissionType,
  ChannelType,
  UserConnectionType,
  decodeCursor,
  encodeCursor,
} from '.';
import { AppAbility } from '@security/defineUserAbility';
import getSortOrder from '@utils/schema/resolvers/Query/getSortOrder';
import { checkIfRoleIsAssignedToUser } from '@utils/user/getAutoAssignedRoles';
import GraphQLJSON from 'graphql-type-json';
import get from 'lodash/get';
import mongoose from 'mongoose';
import { accessibleBy } from '@casl/mongoose';

/** GraphQL Role type definition */
export const RoleType = new GraphQLObjectType({
  name: 'Role',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    title: {
      type: GraphQLString,
      args: {
        appendApplicationName: { type: GraphQLBoolean },
      },
      async resolve(parent, args) {
        if (args.appendApplicationName) {
          const application = await Application.findById(
            parent.application,
            'name'
          );
          return `${application.name} - ${parent.title}`;
        } else {
          return parent.title;
        }
      },
    },
    description: { type: GraphQLString },
    permissions: {
      type: new GraphQLList(PermissionType),
      async resolve(parent) {
        const permission = await Permission.find()
          .where('_id')
          .in(parent.permissions);
        return permission;
      },
    },
    usersCount: {
      type: GraphQLInt,
      async resolve(parent) {
        const count = await User.find({ roles: parent.id }).count();
        return count;
      },
    },
    application: {
      type: ApplicationType,
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const app = await Application.findOne({
          _id: parent.application,
          ...accessibleBy(ability, 'read').Application,
        });
        return app;
      },
    },
    channels: {
      type: new GraphQLList(ChannelType),
      async resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        const channels = await Channel.find(
          accessibleBy(ability, 'read').Channel
        )
          .where('_id')
          .in(parent.channels);
        return channels;
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
            name: '_id',
            cursorId: (node: any) => node._id.toString(),
            cursorFilter: (cursor: any, sortOrder: string) => {
              const operator = sortOrder === 'asc' ? '$gt' : '$lt';
              return {
                _id: {
                  [operator]: new mongoose.Types.ObjectId(decodeCursor(cursor)),
                },
              };
            },
            sort: (sortOrder: string) => {
              return {
                _id: getSortOrder(sortOrder),
              };
            },
          },
        ];

        const first = get(args, 'first', 10);
        const sortField = SORT_FIELDS.find((x) => x.name === '_id');

        const cursorFilters = args.afterCursor
          ? sortField.cursorFilter(args.afterCursor, 'asc')
          : {};

        let filters = {};

        // Switch on automated arguments to query users
        switch (args.automated) {
          case true: {
            const autoAssignedUsers = (
              await User.find({
                $and: [cursorFilters],
              }).sort(sortField.sort('asc'))
            )
              .filter((user) => checkIfRoleIsAssignedToUser(user, parent))
              .map((x) => x._id);
            filters = { _id: { $in: autoAssignedUsers } };
            break;
          }
          case false: {
            filters = { roles: parent.id };
            break;
          }
          default: {
            const autoAssignedUsers = (
              await User.find({
                $and: [cursorFilters],
              }).sort(sortField.sort('asc'))
            )
              .filter((user) => checkIfRoleIsAssignedToUser(user, parent))
              .map((x) => x._id);
            filters = {
              $or: [{ roles: parent.id }, { _id: { $in: autoAssignedUsers } }],
            };
            break;
          }
        }

        let items = await User.find({
          $and: [cursorFilters, filters],
        })
          .sort(sortField.sort('asc'))
          .limit(first + 1);
        const hasNextPage = items.length > first;
        if (hasNextPage) {
          items = items.slice(0, items.length - 1);
        }

        const edges = items.map((r) => ({
          cursor: encodeCursor(sortField.cursorId(r)),
          node: r,
        }));
        return {
          pageInfo: {
            hasNextPage,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          },
          edges,
          totalCount: await User.find(filters).count(),
        };
      },
    },
    autoAssignment: { type: GraphQLJSON },
  }),
});
