import { makeExecutableSchema, mergeSchemas } from 'apollo-server-express';
import { getResolvers } from './resolvers';
import fs from 'fs';
import schema from '../../schema';
import { GraphQLSchema } from 'graphql';
import { getStructures, getReferenceDatas } from './getStructures';
import { Form } from '@models';
import { logger } from '../../services/logger.service';

/** The file path for the GraphQL schemas */
const GRAPHQL_SCHEMA_FILE = 'src/schema.graphql';

/**
 * Build a new GraphQL schema to add to the default one, providing API for the resources / forms.
 *
 * @returns GraphQL schema built from the active resources / forms of the database.
 */
export const buildSchema = async (): Promise<GraphQLSchema> => {
  try {
    const structures = await getStructures();
    const referenceDatas = await getReferenceDatas();

    const typeDefs = fs.readFileSync(GRAPHQL_SCHEMA_FILE, 'utf-8');

    const forms = (await Form.find({}).select('name resource')) as {
      name: string;
      resource?: string;
    }[];

    const resolvers = getResolvers(structures, forms, referenceDatas);

    // Add resolvers to the types definition.
    const builtSchema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Merge default schema and form / resource schema.
    const graphQLSchema = mergeSchemas({
      schemas: [schema, builtSchema],
    });

    logger.info('🔨 Schema built');

    return graphQLSchema;
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return schema;
  }
};
