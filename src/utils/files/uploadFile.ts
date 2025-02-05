import { BlobServiceClient } from '@azure/storage-blob';
import mime from 'mime-types';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import config from 'config';
import get from 'lodash/get';
import { logger } from '@lib/logger';
import fileUpload from 'express-fileupload';
import fs from 'fs';

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
const getOptimalConfig = (fileSize: number) => {
  if (fileSize < 4 * 1024 * 1024) {
    return { bufferSize: 256 * 1024, maxBuffers: 5 };
  } else if (fileSize < 100 * 1024 * 1024) {
    return { bufferSize: 4 * 1024 * 1024, maxBuffers: 20 };
  } else {
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
 * @param options.chunkIndex - Chunk index
 * @param options.totalChunks - total number of chunks
 * @param options.uploadId - Id of the upload
 * @returns Path to the blob.
 */
export const uploadFile = async (
  containerName: string,
  folder: string,
  file: fileUpload.UploadedFile,
  options?: {
    filename?: string;
    allowedExtensions?: string[];
    chunkIndex?: string;
    totalChunks?: string;
    uploadId?: string;
  }
): Promise<string> => {
  const { uploadId } = options ?? {};
  const chunkIndex = Number(options.chunkIndex);
  const totalChunks = Number(options.totalChunks);

  const contentType = mime.lookup(file.name) || '';
  if (
    !contentType ||
    !ALLOWED_EXTENSIONS.includes(mime.extension(contentType) || '')
  ) {
    throw new GraphQLError(i18next.t('common.errors.fileExtensionNotAllowed'));
  }
  if (!uploadId || chunkIndex === undefined || !totalChunks) {
    logger.info(`${uploadId}, ${chunkIndex}, ${totalChunks}`);
    throw new GraphQLError('Missing chunks information');
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
    const tempFilePath = `${uploadId}-${chunkIndex}`;
    fs.writeFileSync(tempFilePath, file.data as any);

    logger.info(
      `Received chunk ${chunkIndex + 1}/${totalChunks} for ${uploadId}`
    );
    console.log(file.size, fs.statSync(tempFilePath).size);
    // If last chunk, merge and upload
    if (chunkIndex + 1 === totalChunks) {
      logger.info(`All chunks received for ${uploadId}. Merging...`);
      const finalFilePath = `${uploadId}-merged`;
      const writeStream = fs.createWriteStream(finalFilePath);

      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = `${uploadId}-${i}`;
        const chunkBuffer = fs.readFileSync(chunkPath);
        writeStream.write(chunkBuffer);
        fs.unlink(chunkPath, (err) => {
          if (err) {
            logger.error(`Error removing chunk ${chunkPath} ${err}`);
          }
        });
      }
      await new Promise((res) => writeStream.end(res));

      logger.info(
        `File merged successfully: ${finalFilePath}, ${writeStream.path}`
      );

      // Upload to Azure
      const blockBlobClient = containerClient.getBlockBlobClient(filename);
      const stream = fs.createReadStream(finalFilePath);
      const blobConfig = getOptimalConfig(fs.statSync(finalFilePath).size);
      console.log(fs.statSync(finalFilePath).size, 'size');
      await blockBlobClient.uploadStream(
        stream,
        blobConfig.bufferSize,
        blobConfig.maxBuffers
      );

      fs.unlink(finalFilePath, (err) => {
        if (err) {
          logger.error(`Error removing final temp file: ${err}`);
        }
      });
      logger.info(`File uploaded to Azure: ${filename}`);
    }
    return filename;
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    throw new GraphQLError(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};
