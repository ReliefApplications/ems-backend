import { GraphQLObjectType, GraphQLString } from "graphql";
import GraphQLJSON from "graphql-type-json";

export const NotificationType = new GraphQLObjectType({
    name: 'Notification',
    fields: () => ({
        action: { type: GraphQLString },
        content: { type: GraphQLJSON },
        createdAt: { type: GraphQLString }
    })
});