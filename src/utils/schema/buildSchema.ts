import { makeExecutableSchema, mergeSchemas } from 'apollo-server-express';
import { getResolvers } from './resolvers';
import fs from 'fs';
import schema from '../../schema';
import { GraphQLSchema } from 'graphql';
import { getStructures } from './getStructures';

const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Build a new GraphQL schema to add to the default one, providing API for the resources / forms.
 * @returns GraphQL schema built from the active resources / forms of the database.
 */
export const buildSchema = async (): Promise<GraphQLSchema> => {
  try {

    const structures = await getStructures();

    const typeDefs = fs.readFileSync(GRAPHQL_SCHEMA_FILE, 'utf-8');

    const resolvers = getResolvers(structures);

    // Add resolvers to the types definition.
    const builtSchema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Merge default schema and form / resource schema.
    const graphQLSchema = mergeSchemas({
      schemas: [
        schema,
        builtSchema,
      ],
    });

    console.log('🔨 Schema built');

    return graphQLSchema;

  } catch (err) {
    console.log(err);
    return schema;
  }
};
