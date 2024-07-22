import {
  GraphQLID,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';
/**
 * GraphQL DistributionList type.
 */
export const EmailDistributionListType = new GraphQLObjectType({
  name: 'QuickEmailDistributionList',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    distributionListName: { type: GraphQLString },
    To: { type: new GraphQLList(GraphQLString) },
    Cc: { type: new GraphQLList(GraphQLString) },
    Bcc: { type: new GraphQLList(GraphQLString) },
    isDeleted: { type: GraphQLInt },
    createdBy: { type: GraphQLJSON },
  }),
});

/** Email Notification connection type */
export const EmailDistributionConnectionType = Connection(
  EmailDistributionListType
);
