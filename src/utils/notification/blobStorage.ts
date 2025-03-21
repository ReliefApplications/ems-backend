import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { logger } from '@services/logger.service';
import config from 'config';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'email.blobStorage.connectionString'
);

/**
 * Uploads image to blob storage for email notification
 *
 * @param imgBase64 Base64 encoded image to upload to Blob Storage
 * @param position Image position in email (banner, header, or footer)
 * @param configId Unique ID of email notification
 * @returns The filename of the uploaded blob, {configId}/{position}.{png/jpg/etc}
 */
export async function blobStorageUpload(
  imgBase64: string,
  position: 'header' | 'footer' | 'banner',
  configId: string
): Promise<string> {
  if (imgBase64.startsWith('http://') || imgBase64.startsWith('https://')) {
    return imgBase64;
  }
  let blobClient: BlockBlobClient;

  const mimedata = imgBase64.split(',')[0]; //data:image/png;base64
  let fileType = mimedata.split('/')[1]; //png;base64
  fileType = fileType.split(';')[0]; //png
  let mimeType = mimedata.split(':')[1]; // image/png;base64
  mimeType = mimeType.split(';')[0]; // image/png
  const fileName = `${configId}/${position}.${fileType}`;
  const base64Raw = imgBase64.split(',')[1];

  try {
    // Azure Blob Storage API : Create the blob client
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    // Client for images
    const containerClient = blobServiceClient.getContainerClient(
      config.get('email.blobStorage.container')
    );
    // Create the client if it doesn't exist
    await containerClient.createIfNotExists();
    blobClient = containerClient.getBlockBlobClient(fileName);
  } catch (err) {
    logger.error(`Failed to create blob client: ${err.message}`);
    throw err;
  }
  try {
    const buffer = Buffer.from(base64Raw, 'base64');
    try {
      await blobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
      });
      return blobClient.url;
    } catch (err) {
      logger.error(`Failed in .uploadData: ${err.message}`);
      throw err;
    }
  } catch (err) {
    logger.error(`Failed to encode blob: ${err.message}`);
    throw err;
  }
}
