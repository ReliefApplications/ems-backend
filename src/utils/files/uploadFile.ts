import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import config from 'config';
import get from 'lodash/get';
import { logger } from '@lib/logger';
import fileUpload from 'express-fileupload';
import { Readable } from 'stream';

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
 * Gets the optimal configuration depending on the file size
 *
 * @param fileSize size of the file to upload
 * @returns best blob config
 */
const getOptimalConfig = (
  fileSize: number
): { bufferSize: number; maxBuffers: number } => {
  if (fileSize < 4 * 1024 * 1024) {
    // <4MB
    return { bufferSize: 256 * 1024, maxBuffers: 5 };
  } else if (fileSize < 100 * 1024 * 1024) {
    // 4MB - 100MB
    return { bufferSize: 4 * 1024 * 1024, maxBuffers: 20 };
  } else {
    // >100MB
    return { bufferSize: 8 * 1024 * 1024, maxBuffers: 40 };
  }
};

/**
 * Upload a file to Azure Blob Storage with support for up to 200MB.
 *
 * @param containerName - Main container name.
 * @param folder - Folder name.
 * @param file - File to store in Azure blob (Express UploadedFile).
 * @param options - Additional options.
 * @param options.filename - Filename to use.
 * @param options.allowedExtensions - Allowed extensions.
 * @param options.chunks - whether we should chunk upload or not
 * @returns Path to the blob.
 */
export const uploadFile = async (
  containerName: string,
  folder: string,
  file: fileUpload.UploadedFile,
  options?: {
    filename?: string;
    allowedExtensions?: string[];
    chunks?: boolean;
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
    const blobName = uuidv4();
    // contains the folder and the blob name.
    const filename = get(options, 'filename', `${folder}/${blobName}`);
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    if (options?.chunks) {
      // Convert buffer to a readable stream
      const stream = Readable.from(file.data);
      const blobConfig = getOptimalConfig(file.size);
      await blockBlobClient.uploadStream(
        stream,
        blobConfig.bufferSize,
        blobConfig.maxBuffers
      );
    } else {
      await blockBlobClient.uploadData(file.data);
    }
    return filename;
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    throw new GraphQLError(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};
