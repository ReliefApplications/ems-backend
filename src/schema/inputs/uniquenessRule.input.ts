import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

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
  severity: 'error' | 'warning';
  message?: string;
  messageTranslations?: Record<string, string>;
  active?: boolean;
  /** Filter restricting the records the rule applies to, as for layouts */
  condition?: any;
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
    messageTranslations: { type: GraphQLJSON },
    active: { type: GraphQLBoolean, defaultValue: true },
    condition: { type: GraphQLJSON },
    dateIntersection: { type: UniquenessDateIntersectionInputType },
  }),
});
