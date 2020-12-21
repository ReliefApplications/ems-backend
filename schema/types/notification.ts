import { GraphQLObjectType, GraphQLString, GraphQLID } from "graphql";
import GraphQLJSON from "graphql-type-json";

export const NotificationType = new GraphQLObjectType({
    name: 'Notification',
    fields: () => ({
        id: { type: GraphQLID },
        action: { type: GraphQLString },
        content: { type: GraphQLJSON },
        createdAt: { type: GraphQLString },
        channel: { type: GraphQLString }
    })
});