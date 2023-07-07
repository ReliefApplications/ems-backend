import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '@services/logger.service';
import config from 'config';
import fs from 'fs';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/**
 * Download a file from Azure storage and put it locally, waiting for the response to be sent.
 *
 * @param request remove to existing file need to request parameter
 * @param containerName Azure blob container name.
 * @param blobName Azure blob name.
 * @param path download to local path.
 * @returns return once file downloaded.
 */
export const downloadFile = async (
  request: any,
  containerName: string,
  blobName: string,
  path: string
): Promise<void> => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  try {
    await blockBlobClient.downloadToFile(path);
    request.download(path, () => {
      fs.unlink(path, () => {
        logger.info('file deleted');
      });
    });
  } catch (error) {
    if (
      error.statusCode &&
      error.code &&
      error.statusCode === 404 &&
      error.code === 'BlobNotFound'
    ) {
      logger.info('The specified blob does not exist.');
    } else {
      logger.error(error.message);
    }
  }
  return;
};
