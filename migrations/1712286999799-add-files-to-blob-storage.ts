import { Form, Record } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@lib/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);
/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  logger.info('Uploading any files saved as base64 to blob storage...');

  // First we check if we have access to the blob storage
  const forms = await Form.find();
  for (const form of forms) {
    if (!form.structure) {
      continue;
    }

    // We iterate over the questions to check if we have a file question
    let records: Record[] | null = null;
    for (const question of form.fields) {
      if (question.type !== 'file') {
        continue;
      }

      if (!records) {
        records = await Record.find({ form: form._id });
      }

      for (const record of records) {
        const data = record.data;
        if (!data) {
          continue;
        }

        // Get the value of the file question
        const value = data[question.name];
        if (Array.isArray(value)) {
          for (const fileObj of value) {
            // First we need to check if the file is already in the blob storage
            // we can check for content in this format "<form-id>/<storage-id>"

            if (fileObj.content?.startsWith(`${form._id.toString()}/`)) {
              // File is already in the blob storage, skip
              continue;
            }
            logger.info(`Found  ${form.name}...`);

            const matches = fileObj.content.match(/^data:(.+);base64,(.+)$/);
            let base64Data = '';
            if (matches.length === 3) {
              base64Data = matches[2];
            } else {
              logger.error('Invalid Data URI, skipping...');
              continue;
            }

            try {
              const blobServiceClient = BlobServiceClient.fromConnectionString(
                AZURE_STORAGE_CONNECTION_STRING
              );
              const containerClient =
                blobServiceClient.getContainerClient('forms');
              if (!(await containerClient.exists())) {
                await containerClient.create();
              }
              const blobName = uuidv4();
              // contains the folder and the blob name.
              const filename = `${form._id.toString()}/${blobName}`;
              const blockBlobClient =
                containerClient.getBlockBlobClient(filename);

              const buffer = Buffer.from(base64Data, 'base64');
              logger.info(
                `Uploading file ${fileObj.name} to blob storage... (${record.incrementalId} on form ${form.name})`
              );
              await blockBlobClient.uploadData(buffer);
              // Update the content of the file question to the new blob storage path
              fileObj.content = filename;
              record.markModified('data');
              await record.save();
            } catch (err) {
              logger.error(err.message, { stack: err.stack });
              throw new GraphQLError(
                i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
              );
            }
          }
        }
      }
    }
  }
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
