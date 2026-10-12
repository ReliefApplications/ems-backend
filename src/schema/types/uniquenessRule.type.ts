import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { getConditionFilter } from '@utils/form';

/** GraphQL uniqueness rule date intersection type definition */
export const UniquenessDateIntersectionType = new GraphQLObjectType({
  name: 'UniquenessDateIntersectionType',
  fields: () => ({
    startField: { type: GraphQLString },
    endField: { type: GraphQLString },
    allowAdjacent: { type: GraphQLBoolean },
  }),
});

/** GraphQL uniqueness rule type definition */
export const UniquenessRuleType = new GraphQLObjectType({
  name: 'UniquenessRuleType',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLString) },
    severity: { type: GraphQLString },
    message: { type: GraphQLString },
    messageTranslations: { type: GraphQLJSON },
    active: { type: GraphQLBoolean },
    condition: {
      type: GraphQLJSON,
      // Always returned as a filter, whatever the format it is stored with
      resolve: (parent) => getConditionFilter(parent.condition),
    },
    dateIntersection: {
      type: UniquenessDateIntersectionType,
      // Rules without date intersection are stored with an empty object
      resolve: (parent) =>
        parent.dateIntersection?.startField && parent.dateIntersection?.endField
          ? parent.dateIntersection
          : null,
    },
  }),
});
