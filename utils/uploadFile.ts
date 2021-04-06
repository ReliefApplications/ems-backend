import { BlobServiceClient }from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

export default async (file: any, form: string) => {
    const {createReadStream, filename, mimetype} = file;
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(form);
    if (!await containerClient.exists()) {
        await containerClient.create();
    }
    const blobName = uuidv4();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const fileStream = createReadStream();
    const uploadBlobResponse = await blockBlobClient.uploadStream(fileStream);
    // const uploadBlobResponse = await blockBlobClient.upload(file.content, file.content.length);
    console.log("Blob was uploaded successfully. requestId: ", uploadBlobResponse.requestId);
    return `${form}/${blobName}`;
};