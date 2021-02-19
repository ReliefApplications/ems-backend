import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";

export const PositionAttributeCategoryType = new GraphQLObjectType({
    name: 'PositionAttributeCategory',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString }
    }),
});