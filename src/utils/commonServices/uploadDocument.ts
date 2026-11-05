import axios from 'axios';
import config from 'config';

/**
 * How a file is uploaded to document management: the properties sent to
 * common services along with the file, as the client computes them from the
 * file question.
 */
export type DocumentUpload = {
  /** Drive receiving the file */
  driveId: string;
  /** Properties of the document ( e.g. document type, occurrence type ) */
  body?: { [property: string]: unknown };
};

/** Document management item */
export type DocumentItem = {
  driveId: string;
  itemId: string;
};

/**
 * Uploads a file to document management ( common services ), on behalf of a
 * user.
 *
 * @param file File to upload
 * @param file.name Name of the file
 * @param file.data Content of the file
 * @param upload Drive and document properties to upload the file with
 * @param accessToken Access token of the user, for common services
 * @returns Document management item of the file
 */
export const uploadDocument = async (
  file: { name: string; data: Buffer },
  upload: DocumentUpload,
  accessToken: string
): Promise<DocumentItem> => {
  const base = config.get<string>('commonServices.url').replace(/\/+$/, '');
  const { data } = await axios.post(
    `${base}/documents/drives/${encodeURIComponent(upload.driveId)}/items`,
    {
      ...(upload.body || {}),
      FileStream: file.data.toString('base64'),
      FileName: file.name,
    },
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  );
  if (!data?.driveId || !data?.itemId) {
    throw new Error(`Document management did not store ${file.name}`);
  }
  return { driveId: data.driveId, itemId: data.itemId };
};
