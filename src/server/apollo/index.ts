import { ApolloServer } from '@apollo/server';
// import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
// import context from './context';
// import dataSources from './dataSources';
// import onConnect from './onConnect';
// import { makeExecutableSchema } from '@graphql-tools/schema';
/**
 * Builds the Apollo Server from the schema.
 *
 * @param apiSchema GraphQL schema.
 * @returns Apollo Server.
 */
const apollo = async (apiSchema: GraphQLSchema) =>
  // {
  //   const newData: any = {
  //     uploads: false,
  //     schema: apiSchema,
  //     introspection: true,
  //     playground: true,
  //     subscriptions: {
  //       onConnect: onConnect,
  //     },
  //     context: context,
  //     dataSources: await dataSources(),
  //   };
  //   return new ApolloServer(newData);
  // };

  // new ApolloServer({
  //   schema: makeExecutableSchema({
  //     typeDefs: apiSchema,
  //   }),
  //   introspection: true,
  //   uploads?: false,
  //   subscriptions: {
  //     onConnect: onConnect,
  //   },
  //   context: context,
  //   dataSources: async () => await dataSources(),
  //   plugins:
  // });
  new ApolloServer({
    //   uploads: false,
    schema: apiSchema,
    // introspection: true,
    //   playground: true,
    //   subscriptions: {
    //     onConnect: onConnect,
    //   },
    //   context: context,
    //   dataSources: await dataSources(),
  });

// new ApolloServer({
//   schema: apiSchema,
//   introspection: true,
// });

export default apollo;
