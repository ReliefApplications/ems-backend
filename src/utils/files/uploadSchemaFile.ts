import fs from 'fs';
import config from 'config';
import i18next from 'i18next';
import { logger } from '@services/logger.service';
import { BlobServiceClient } from '@azure/storage-blob';
import { printSchema } from 'graphql';
import buildSchema from '@utils/schema/buildSchema';

/** Storage connection string */
// const STORAGE_CONNECTION_STRING: string = config.get('public.fileName');
const STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/**
 * Generate and save GraphQL schema file.
 */
const generateAndSaveSchema = async () => {
  // GraphQL schema object
  const schema = await buildSchema();
  // Print schema to string
  const schemaString = printSchema(schema);
  // Save schema to file and return it
  fs.writeFileSync('schema.graphql', schemaString);
  return fs.readFileSync('schema.graphql');
};

/**
 *  Upload GraphQL schema file in public storage.
 *
 * @param containerName main container name
 * @param blobName blob name
 * @param file GraphQL schema file
 */
const uploadFile = async (
  containerName: string,
  blobName: string,
  file: any
) => {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(file);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    // NO WORKING, always cath error
    console.log('err: ', err);
    throw new Error(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};

/**
 * Generates, save and upload in a public storage the GraphQL schema file.
 */
export const uploadSchemaFile = async () => {
  try {
    // Call function to generate and save schema
    const file = await generateAndSaveSchema();
    // Upload file
    await uploadFile('public', 'introspection/schema.graphql', file);
  } catch (err) {
    logger.error(err.message);
  }
};
