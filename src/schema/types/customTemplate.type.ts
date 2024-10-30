import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';
/**
 * GraphQL DistributionList type.
 */
export const CustomTemplateType = new GraphQLObjectType({
  name: 'CustomTemplate',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    subject: { type: GraphQLString },
    header: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
    banner: { type: GraphQLJSON },
    footer: { type: GraphQLJSON },
    isDeleted: { type: GraphQLInt },
    createdBy: { type: GraphQLJSON },
    applicationId: { type: GraphQLID },
    isFromEmailNotification: { type: GraphQLBoolean },
    navigateToPage: { type: GraphQLBoolean, defaultValue: false },
  }),
});

/** Custom Template connection type */
export const CustomTemplateConnectionType = Connection(CustomTemplateType);
