import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";
import GraphQLJSON from "graphql-type-json";

export const VersionType = new GraphQLObjectType({
    name: 'Version',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        data: { type: GraphQLJSON },
    }),
});