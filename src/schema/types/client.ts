import { GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql';

export const ClientType = new GraphQLObjectType({
    name: 'Client',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        modifiedAt: { type: GraphQLString },
        description: { type: GraphQLString },
        origins: { type: new GraphQLList(GraphQLString) }
    })
});