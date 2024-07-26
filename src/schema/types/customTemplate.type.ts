import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
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
    subject: { type: GraphQLString },
    header: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
    banner: { type: GraphQLJSON },
    footer: { type: GraphQLJSON },
    isDeleted: { type: GraphQLInt },
    createdBy: { type: GraphQLJSON },
    applicationId: { type: GraphQLID },
  }),
});

/** Custom Template connection type */
export const CustomTemplateConnectionType = Connection(CustomTemplateType);
