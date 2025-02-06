import { BlobServiceClient } from '@azure/storage-blob';
import { logger } from '@lib/logger';
import config from 'config';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/**
 * Downloads a file from Azure Blob Storage in chunks for faster retrieval.
 *
 * @param containerName - Azure blob container name.
 * @param blobName - Azure blob name.
 * @param path - Local path to save the file.
 */
export const downloadFile = async (
  containerName: string,
  blobName: string,
  path: string
): Promise<void> => {
  const streamPipeline = promisify(pipeline);
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  try {
    const properties = await blockBlobClient.getProperties();
    const blobSize = properties.contentLength;
    const chunkSize = 8 * 1024 * 1024; //8MB chunk size
    const numChunks = Math.max(Math.ceil(blobSize / chunkSize), 1);

    // Ensure the directory exists
    const pathToFile = path.substring(0, path.lastIndexOf('/'));
    if (!fs.existsSync(pathToFile)) {
      fs.mkdirSync(pathToFile, { recursive: true });
    }

    const fileHandle = fs.createWriteStream(path);

    // Download chunks in parallel
    await Promise.all(
      Array.from({ length: numChunks }, async (_, i) => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, blobSize - 1);

        const response = await blockBlobClient.download(start, end - start + 1);
        await streamPipeline(
          response.readableStreamBody,
          fs.createWriteStream(path, { flags: 'r+', start })
        );
      })
    );

    fileHandle.end();
  } catch (err) {
    logger.error(err.message);
    throw new Error(err.message);
  }
  return;
};
