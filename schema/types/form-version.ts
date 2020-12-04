import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";
import GraphQLJSON from "graphql-type-json";

export const FormVersionType = new GraphQLObjectType({
    name: 'FormVersion',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        structure: { type: GraphQLJSON },
    }),
});