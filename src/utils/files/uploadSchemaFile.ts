import fs from 'fs';
import { logger } from '@services/logger.service';
import { GraphQLSchema, printSchema } from 'graphql';
import { uploadFile } from './uploadFile';

/**
 * Generate and save GraphQL schema file.
 *
 * @param schema GraphQL schema.
 */
const generateAndSaveSchema = async (schema: GraphQLSchema) => {
  // Print schema to string
  const schemaString = printSchema(schema);
  // Save schema to file and return it
  fs.writeFileSync('schema', schemaString);
  return fs.readFileSync('schema');
};

/**
 * Generates and upload in a public storage the GraphQL schema file.
 *
 * @param schema GraphQL schema.
 */
export const uploadSchemaFile = async (schema: GraphQLSchema) => {
  try {
    // Call function to generate and save schema
    const file = await generateAndSaveSchema(schema);
    // Upload file
    await uploadFile('public', 'introspection', file, {
      skipExtension: true,
      filename: 'introspection/schema',
    });
  } catch (err) {
    logger.error(err.message);
  }
};
