import { GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql';

import { GraphQLDateTime } from 'graphql-iso-date';

const changeType = new GraphQLObjectType({
  name: 'Change',
  fields: () => ({
    type: { type: GraphQLString },
    displayType: { type: GraphQLString },
    field: { type: GraphQLString },
    displayName: { type: GraphQLString },
    old: { type: GraphQLString },
    new: { type: GraphQLString },
  }),
});

export const HistoryVersionType = new GraphQLObjectType({
  name: 'HistoryVersion',
  fields: () => ({
    created: { type: GraphQLDateTime },
    createdBy: { type: GraphQLString },
    changes: { type: GraphQLList(changeType) },
  }),
});
