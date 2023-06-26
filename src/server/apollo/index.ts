import { ApolloServer } from '@apollo/server';
// import { makeExecutableSchema } from '@graphql-tools/schema';
// import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
interface MyContext {
  context?: any;
  dataSources?: any;
  subscriptions?: {
    onConnect: any;
  };
}

/**
 * Builds the Apollo Server from the schema.
 *
 * @param apiSchema GraphQL schema.
 * @returns Apollo Server.
 */
const apollo = async (apiSchema: GraphQLSchema) =>
  new ApolloServer<MyContext>({
    schema: apiSchema,
    introspection: true,
  });
export default apollo;
