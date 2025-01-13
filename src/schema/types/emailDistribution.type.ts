import {
  GraphQLID,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';
import { QueryType } from './emailNotification.type';

/**
 * Defines filter used as part of distribution list.
 */
export const DistributionListSource = new GraphQLObjectType({
  name: 'DistributionListSource',
  fields: () => ({
    resource: { type: GraphQLString },
    reference: { type: GraphQLString },
    commonServiceFilter: { type: GraphQLJSON },
    query: { type: QueryType },
    inputEmails: { type: new GraphQLList(GraphQLString) },
  }),
});

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
    to: { type: DistributionListSource },
    cc: { type: DistributionListSource },
    bcc: { type: DistributionListSource },
    isDeleted: { type: GraphQLInt },
    createdBy: { type: GraphQLJSON },
    applicationId: { type: GraphQLID },
  }),
});

/** Email Notification connection type */
export const EmailDistributionConnectionType = Connection(
  EmailDistributionListType
);
