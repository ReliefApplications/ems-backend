import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { GraphQLError } from 'graphql';
import i18next from 'i18next';
import config from 'config';

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
];

/**
 * Upload a file in Azure storage.
 *
 * @param file file to store in Azure blob
 * @param form form to attach the file to
 * @returns path to the blob.
 */
export const uploadFile = async (file: any, form: string): Promise<string> => {
  const { createReadStream } = file;
  const contentType = mime.lookup(file.filename) || '';
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
    const containerClient = blobServiceClient.getContainerClient('forms');
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }
    const blobName = uuidv4();
    // contains the folder and the blob name.
    const filename = `${form}/${blobName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    const fileStream = createReadStream();
    await blockBlobClient.uploadStream(fileStream);
    return filename;
  } catch {
    throw new GraphQLError(
      i18next.t('utils.files.uploadFile.errors.fileCannotBeUploaded')
    );
  }
};
