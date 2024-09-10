import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '@lib/logger';
import config from 'config';
import fs from 'fs';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/**
 * Download a file from Azure storage and put it locally, waiting for the response to be sent.
 *
 * @param containerName Azure blob container name.
 * @param blobName Azure blob name.
 * @param path download to local path.
 * @returns return once file downloaded.
 */
export const downloadFile = async (
  containerName: string,
  blobName: string,
  path: string
): Promise<void> => {
  // Azure Blob Storage API : Create the blob client
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  try {
    // If path does not exist, create it
    const pathArr = path.split('/');
    pathArr.pop();
    const pathToFile = pathArr.join('/');

    if (!fs.existsSync(pathToFile))
      fs.mkdirSync(pathToFile, { recursive: true });
    await blockBlobClient.downloadToFile(path);
  } catch (err) {
    logger.error(err.message);
    throw new Error(err.message);
  }
  return;
};
