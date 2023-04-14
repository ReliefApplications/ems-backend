import { BlobServiceClient } from '@azure/storage-blob';
import config from 'config';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

export const copyFolder = async (
  containerName: string,
  source: string,
  destination: string
): Promise<any> => {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const promises: Promise<any>[] = [];
  for await (const blob of containerClient.listBlobsFlat({ prefix: source })) {
    const sourceClient = containerClient.getBlobClient(blob.name);
    const destinationClient = containerClient.getBlobClient(
      blob.name.replace(source, destination)
    );
    promises.push(destinationClient.syncCopyFromURL(sourceClient.url));
  }
  return Promise.all(promises);
};
