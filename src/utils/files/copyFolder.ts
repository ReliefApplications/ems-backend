import { BlobSASPermissions, BlobServiceClient } from '@azure/storage-blob';
import config from 'config';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/** @returns Expiration date of temporary copy url */
const expiresOn = () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  return oneHourLater;
};

/**
 * Copy Blob folder
 *
 * @param containerName container of folder
 * @param source source folder
 * @param destination destination folder
 * @returns Copying process
 */
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

    promises.push(
      // Generate a temporary url to be able to get a copy of the file
      sourceClient
        .generateSasUrl({
          permissions: BlobSASPermissions.from({ read: true }),
          expiresOn: expiresOn(),
        })
        .then((url) => {
          destinationClient.syncCopyFromURL(url);
        })
    );
    // promises.push(destinationClient.syncCopyFromURL(sourceClient.url));
  }
  return Promise.all(promises);
};
