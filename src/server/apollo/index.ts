import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
import context from './context';
import onConnect from './onConnect';

export default (apiSchema: GraphQLSchema) => new ApolloServer({
    uploads: false,
    schema: apiSchema,
    introspection: true,
    playground: true,
    subscriptions: {
        onConnect: onConnect
    },
    context: context
});
