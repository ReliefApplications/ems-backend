import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
import context from './context';
import dataSources from './dataSources';
import onConnect from './onConnect';

/**
 * Builds the Apollo Server from the schema.
 *
 * @param apiSchema GraphQL schema.
 * @returns Apollo Server.
 */
const apollo = async (apiSchema: GraphQLSchema): Promise<ApolloServer> =>
  new ApolloServer({
    uploads: false,
    schema: apiSchema,
    introspection: true,
    playground: true,
    subscriptions: {
      onConnect: onConnect,
    },
    context: context,
    dataSources: await dataSources(),
  });

export default apollo;
