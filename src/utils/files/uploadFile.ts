import { BlobServiceClient }from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import FileType from 'file-type';
import { GraphQLError } from 'graphql';
import errors from '../../const/errors';
dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const ALLOWED_EXTENSIONS = ['bmp', 'csv', 'doc', 'docm', 'docx', 'eml', 'epub', 'gif', 'gz', 'htm', 'html', 'jpg', 'jpeg', 'msg', 'odp', 'odt', 'ods', 'pdf', 'png', 'ppt', 'pptx', 'pptm', 'rtf', 'txt', 'xls', 'xlsx', 'xps', 'zip', 'xlsm', 'xml'];

/**
 * Upload a file in Azure storage.
 * @param file file to store in Azure blob
 * @param form form to attach the file to
 * @returns path to the blob.
 */
export const uploadFile = async (file: any, form: string): Promise<string> => {
    const { createReadStream } = file;
    const fileType = await FileType.fromStream(createReadStream());
    console.log('checking file');
    console.log(fileType.ext);
    console.log(ALLOWED_EXTENSIONS);
    if (!fileType || !ALLOWED_EXTENSIONS.includes(fileType.ext)) {
        throw new GraphQLError(errors.fileExtensionNotAllowed);
    }
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient('forms');
        if (!await containerClient.exists()) {
            await containerClient.create();
        }
        const blobName = uuidv4();
        // contains the folder and the blob name.
        const filename = `${form}/${blobName}`
        const blockBlobClient = containerClient.getBlockBlobClient(filename);
        const fileStream = createReadStream();
        await blockBlobClient.uploadStream(fileStream);
        return filename;
    } catch {
        throw new GraphQLError(errors.fileCannotBeUploaded);
    }
};
