import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL uniqueness rule condition type definition */
export const UniquenessConditionType = new GraphQLObjectType({
  name: 'UniquenessConditionType',
  fields: () => ({
    field: { type: GraphQLString },
    operator: { type: GraphQLString },
    value: { type: GraphQLJSON },
  }),
});

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
    name: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLString) },
    severity: { type: GraphQLString },
    message: { type: GraphQLString },
    condition: { type: new GraphQLList(UniquenessConditionType) },
    dateIntersection: { type: UniquenessDateIntersectionType },
  }),
});
