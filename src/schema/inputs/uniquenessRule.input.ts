import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/** UniquenessCondition type for queries/mutations argument */
export type UniquenessConditionArgs = {
  field: string;
  operator?: 'eq' | 'ne';
  value: any;
};

/** GraphQL uniqueness rule condition input type definition */
export const UniquenessConditionInputType = new GraphQLInputObjectType({
  name: 'UniquenessConditionInputType',
  fields: () => ({
    field: { type: new GraphQLNonNull(GraphQLString) },
    operator: { type: GraphQLString, defaultValue: 'eq' },
    value: { type: new GraphQLNonNull(GraphQLJSON) },
  }),
});

/** UniquenessDateIntersection type for queries/mutations argument */
export type UniquenessDateIntersectionArgs = {
  startField: string;
  endField: string;
  allowAdjacent?: boolean;
};

/** GraphQL uniqueness rule date intersection input type definition */
export const UniquenessDateIntersectionInputType = new GraphQLInputObjectType({
  name: 'UniquenessDateIntersectionInputType',
  fields: () => ({
    startField: { type: new GraphQLNonNull(GraphQLString) },
    endField: { type: new GraphQLNonNull(GraphQLString) },
    allowAdjacent: { type: GraphQLBoolean },
  }),
});

/** UniquenessRule type for queries/mutations argument */
export type UniquenessRuleArgs = {
  name?: string;
  fields: string[];
  severity?: 'error' | 'warning';
  message?: string;
  condition?: UniquenessConditionArgs[];
  dateIntersection?: UniquenessDateIntersectionArgs;
};

/** GraphQL uniqueness rule input type definition */
export const UniquenessRuleInputType = new GraphQLInputObjectType({
  name: 'UniquenessRuleInputType',
  fields: () => ({
    name: { type: GraphQLString },
    fields: { type: new GraphQLNonNull(new GraphQLList(GraphQLString)) },
    severity: { type: GraphQLString, defaultValue: 'error' },
    message: { type: GraphQLString },
    condition: { type: new GraphQLList(UniquenessConditionInputType) },
    dateIntersection: { type: UniquenessDateIntersectionInputType },
  }),
});
