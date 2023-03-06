import { BlobServiceClient } from '@azure/storage-blob';
import config from 'config';

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
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.downloadToFile(path);
  return;
};
