import { GraphQLID, GraphQLObjectType, GraphQLString } from 'graphql';
import { Connection } from './pagination.type';

/** Minimal draft record fields returned by the draft picker query. */
export const DraftRecordType = new GraphQLObjectType({
  name: 'DraftRecord',
  fields: () => ({
    id: { type: GraphQLID },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
  }),
});

/** Paginated draft record summaries. */
export const DraftRecordConnectionType = Connection(DraftRecordType);
