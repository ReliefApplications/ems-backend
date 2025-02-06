import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import mime from 'mime-types';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import config from 'config';
import get from 'lodash/get';
import { logger } from '@lib/logger';
import fileUpload from 'express-fileupload';
import { v4 as uuidv4 } from 'uuid';

/** Azure storage connection string */
const AZURE_STORAGE_CONNECTION_STRING: string = config.get(
  'blobStorage.connectionString'
);

/** Allowed file extensions for file upload */
const ALLOWED_EXTENSIONS = [
  'bmp',
  'csv',
  'doc',
  'docm',
  'docx',
  'eml',
  'epub',
  'gif',
  'gz',
  'htm',
  'html',
  'jpg',
  'jpeg',
  'msg',
  'odp',
  'odt',
  'ods',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'pptm',
  'rtf',
  'txt',
  'xls',
  'xlsx',
  'xps',
  'zip',
  'xlsm',
  'xml',
  'css',
  'scss',
];

/**
 * keeps the state of ongoing uploads
 */
const chunkMap: Set<string> = new Set();

/**
 * Upload one chunk
 *
 * @param containerClient container name to upload to
 * @param blobName Name of the blob
 * @param chunk Chunk buffer data
 * @param chunkId chunk id
 */
const uploadChunk = async (
  containerClient: ContainerClient,
  blobName: string,
  chunk: Buffer,
  chunkId: string
): Promise<void> => {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.stageBlock(chunkId, chunk, chunk.length);
  chunkMap.add(chunkId);
};

/**
 * Upload a file to Azure Blob Storage with support for up to 200MB.
 *
 * @param containerName - Main container name.
 * @param folder - Folder name.
 * @param file - File to store in Azure blob (Express UploadedFile).
 * @param uploadId - Id of the uploading file
 * @param chunkList - List of all chunks that should be in the blob
 * @param chunkId - Id of the current chunk
 * @param options - Additional options.
 * @param options.filename - Filename to use.
 * @param options.allowedExtensions - Allowed extensions.
 * @returns Path to the blob.
 */
export const uploadChunkFile = async (
  containerName: string,
  folder: string,
  file: fileUpload.UploadedFile,
  uploadId: string,
  chunkList: string[],
  chunkId: string,
  options?: {
    filename?: string;
    allowedExtensions?: string[];
  }
): Promise<string> => {
  const contentType = mime.lookup(file.name) || '';
  if (
    !contentType ||
    !ALLOWED_EXTENSIONS.includes(mime.extension(contentType) || '')
  ) {
    throw new GraphQLError(i18next.t('common.errors.fileExtensionNotAllowed'));
  }
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }

    const filename = get(options, 'filename', `${folder}/${uploadId}`);
    await uploadChunk(containerClient, filename, file.data, chunkId);

    if (chunkList.every((id) => chunkMap.has(id))) {
      //If every chunk has been uploaded, commit it to azure
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      await blockBlobClient.commitBlockList(chunkList);
      chunkList.forEach((id) => chunkMap.delete(id));
      return filename;
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    throw new GraphQLError(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};

/**
 * Upload a file in Azure storage.
 *
 * @param containerName main container name
 * @param folder folder name
 * @param file file to store in Azure blob
 * @param options additional options
 * @param options.filename filename to use
 * @param options.allowedExtensions allowed extensions
 * @returns path to the blob.
 */
export const uploadFile = async (
  containerName: string,
  folder: string,
  file: any,
  options?: {
    filename?: string;
    allowedExtensions?: string[];
  }
): Promise<string> => {
  const contentType = mime.lookup(file.filename || file.name) || '';
  if (
    !contentType ||
    !ALLOWED_EXTENSIONS.includes(mime.extension(contentType) || '')
  ) {
    throw new GraphQLError(i18next.t('common.errors.fileExtensionNotAllowed'));
  }
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );
    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }
    const blobName = uuidv4();
    // contains the folder and the blob name.
    const filename = get(options, 'filename', `${folder}/${blobName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    await blockBlobClient.uploadData(file.data);
    return filename;
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    throw new GraphQLError(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};
