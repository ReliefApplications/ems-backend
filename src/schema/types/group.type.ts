import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
} from 'graphql';
import { User } from '@models';

/** GraphQL Group type definition */
export const GroupType = new GraphQLObjectType({
  name: 'Group',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id;
      },
    },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    usersCount: {
      type: GraphQLInt,
      async resolve(parent) {
        const users = await User.find({ groups: parent.id }).count();
        return users;
      },
    },
  }),
});
