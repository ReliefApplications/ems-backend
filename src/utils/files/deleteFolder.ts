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
  // const promises: Promise<any>[] = [];
  // for await (const blob of containerClient.listBlobsFlat({ prefix: folder })) {
  //     promises.push(containerClient.deleteBlob(blob.name));
  // }
  const seenBlobNames = [];
  const blobList = await containerClient.listBlobsFlat({
    prefix: folder,
  });
  for await (const blob of blobList) {
    if (!seenBlobNames.includes(blob.name)) {
      seenBlobNames.push(blob.name);
    }
  }

  for (const blobName of seenBlobNames) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const blobExists = await blockBlobClient.exists();
    if (blobExists) {
      await containerClient.deleteBlob(blobName);
    }
  }
  // return Promise.all(promises);
};
