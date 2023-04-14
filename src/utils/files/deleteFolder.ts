import { BlobServiceClient } from '@azure/storage-blob';
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
  for await (const blob of containerClient.listBlobsFlat({ prefix: folder })) {
    promises.push(containerClient.deleteBlob(blob.name));
  }
  return Promise.all(promises);
};
