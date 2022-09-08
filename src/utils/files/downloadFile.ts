import { BlobServiceClient } from '@azure/storage-blob';
import * as dotenv from 'dotenv';
dotenv.config();

/** Azure storage connection string */
const BLOB_STORAGE_CONNECTION_STRING =
  process.env.BLOB_STORAGE_CONNECTION_STRING;

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
    BLOB_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.downloadToFile(path);
  return;
};
