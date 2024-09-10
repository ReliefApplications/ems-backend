import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '@lib/logger';
import config from 'config';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/**
 * Delete blob folder in azure blob storage
 *
 * @param containerName container name
 * @param folder folder name
 * @returns folder delete as promise
 */
export const deleteFolder = async (
  containerName: string,
  folder: string
): Promise<any> => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const promises: Promise<any>[] = [];
  const blobNames: string[] = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix: folder })) {
    blobNames.push(blob.name);
    //promises.push(containerClient.deleteBlob(blob.name));
  }
  for (const blobName of new Set(blobNames)) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    promises.push(
      blockBlobClient.exists().then((value) => {
        if (value) {
          containerClient
            .deleteBlob(blobName)
            .then(() => logger.info(`File ${blobName} successfully removed.`));
        } else {
          logger.info(`File ${blobName} does not exist.`);
        }
      })
    );
  }
  return Promise.all(promises).catch((err) => {
    throw new Error(err.message);
  });
};
