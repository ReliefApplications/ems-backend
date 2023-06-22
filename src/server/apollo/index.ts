import { ApolloServer } from '@apollo/server';
// import { makeExecutableSchema } from '@graphql-tools/schema';
// import { ApolloServer } from 'apollo-server-express';
import { GraphQLSchema } from 'graphql';
import context from './context';
import dataSources from './dataSources';
import onConnect from './onConnect';
import { getReferenceDatas, getStructures } from '@utils/schema/getStructures';
import fs from 'fs';
import { Form } from '@models';
import { getResolvers } from '@utils/schema/resolvers';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

/** The file path for the GraphQL schemas */
const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Builds the Apollo Server from the schema.
 *
 * @param apiSchema GraphQL schema.
 * @returns Apollo Server.
 */

// const apollo = async (apiSchema: GraphQLSchema) => {
const apollo = async () => {
  const structures = await getStructures();
  const referenceDatas = await getReferenceDatas();

  const typeDefs = fs.readFileSync(GRAPHQL_SCHEMA_FILE, 'utf-8');

  const forms = (await Form.find({}).select('name resource')) as {
    name: string;
    resource?: string;
  }[];

  const resolvers = getResolvers(structures, forms, referenceDatas);

  const newData: any = {
    uploads: false,
    typeDefs,
    resolvers,
    introspection: true,
    playground: true,
    subscriptions: {
      onConnect: onConnect,
    },
    context: context,
    dataSources: await dataSources(),
    plugins: [
      // Install a landing page plugin based on NODE_ENV
      ApolloServerPluginLandingPageLocalDefault({ footer: false }),
    ],
  };
  return new ApolloServer(newData);
  // return new ApolloServer({
  //   typeDefs,
  //   resolvers,
  //   introspection: true,
  //   plugins: [
  //     // Install a landing page plugin based on NODE_ENV
  //     ApolloServerPluginLandingPageLocalDefault({ footer: false }),
  //   ],
  // });
};

// new ApolloServer({
//   schema: makeExecutableSchema({
//     typeDefs: apiSchema,
//   }),
//     introspection: true,
// })
//   uploads?: false,
//   subscriptions: {
//     onConnect: onConnect,
//   },
//   context: context,
//   dataSources: async () => await dataSources(),
//   plugins:
// });
// new ApolloServer({
//   //   uploads: false,
//   schema: apiSchema,
//   introspection: true,
//   plugins: [ApolloServerPluginLandingPageLocalDefault()],
//   //   playground: true,
//   //   subscriptions: {
//   //     onConnect: onConnect,
//   //   },
//   //   context: context,
//   //   dataSources: await dataSources(),
// });

// new ApolloServer({
//   schema: apiSchema,
//   introspection: true,
// });

export default apollo;
