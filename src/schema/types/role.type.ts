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
      resolve(parent) {
        return Permission.find().where('_id').in(parent.permissions);
      },
    },
    usersCount: {
      type: GraphQLInt,
      resolve(parent) {
        return User.find({ roles: parent.id }).count();
      },
    },
    application: {
      type: ApplicationType,
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Application.findById(parent.application).accessibleBy(
          ability,
          'read'
        );
      },
    },
    channels: {
      type: new GraphQLList(ChannelType),
      resolve(parent, args, context) {
        const ability: AppAbility = context.user.ability;
        return Channel.accessibleBy(ability, 'read')
          .where('_id')
          .in(parent.channels);
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
