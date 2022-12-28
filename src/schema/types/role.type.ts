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
import { getAutoAssignedUsers } from '@utils/user/getAutoAssignedRoles';
import GraphQLJSON from 'graphql-type-json';

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
      },
      async resolve(parent, args) {
        const DEFAULT_FIRST = 10;
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

        const first = args.first || DEFAULT_FIRST;
        const sortField = SORT_FIELDS.find((x) => x.name === 'createdAt');

        const cursorFilters = args.afterCursor
          ? sortField.cursorFilter(args.afterCursor, 'asc')
          : {};

        let items = await User.find({
          $and: [cursorFilters, { roles: parent.id }],
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
          totalCount: await User.find({ roles: parent.id }).count(),
        };
      },
    },
    autoAssignedUsers: {
      type: UserConnectionType,
      args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
      },
      async resolve(parent, args) {
        console.log('parent ==>> ', parent);
        const DEFAULT_FIRST = 10;
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

        const first = args.first || DEFAULT_FIRST;
        const sortField = SORT_FIELDS.find((x) => x.name === 'createdAt');

        const cursorFilters = args.afterCursor
          ? sortField.cursorFilter(args.afterCursor, 'asc')
          : {};

        let users = await User.find({
          $and: [cursorFilters],
        }).sort(sortField.sort('asc'));

        let items = [];
        for await (const user of users) {
          const isAutoAssign = await getAutoAssignedUsers(user, parent);
          if (isAutoAssign) {
            items.push(user);
          }
        }

        let start = 0;
        const totalCount = items.length;
        if (args.afterCursor) {
          start = items.findIndex((x) => x.cursor === args.afterCursor) + 1;
        }
        items = items.slice(start, start + first + 1);

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
          totalCount: totalCount,
        };
      },
    },
    autoAssignment: { type: GraphQLJSON },
  }),
});
