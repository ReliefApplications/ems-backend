import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean } from "graphql";

export const ChannelType = new GraphQLObjectType({
    name: 'Channel',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        global: { type: GraphQLBoolean },
    }),
});