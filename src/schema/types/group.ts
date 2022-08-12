import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
} from 'graphql';
import config from 'config';
import { User } from '../../models';

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
      resolve(parent) {
        return User.find({ groups: parent.id }).count();
      },
    },
  }),
});

/** GraphQL groups and manual creation flag type */
export const GroupsAndFlagType = new GraphQLObjectType({
  name: 'GroupsAndFlag',
  fields: () => ({
    values: { type: new GraphQLList(GroupType) },
    manualCreation: {
      type: GraphQLBoolean,
      resolve() {
        return config.get('groups.manualCreation');
      },
    },
  }),
});
