import { Record } from '@models';
import { Resource } from '@models/resource.model';
import { logger } from '@services/logger.service';
import { downloadFile } from '@utils/files/downloadFile';
import axios from 'axios';
import config from 'config';
import fs from 'fs';
import { isNil } from 'lodash';
import sanitize from 'sanitize-filename';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Temporal links for files */
const temporalLinks = [];

/** Migration description */
export const description =
  'Update resources files storage from blob storage to the document management system';

/**
 * Get token for common services API.
 *
 * @returns token
 */
export const getToken = async () => {
  const details: any = {
    grant_type: 'client_credentials',
    client_id: config.get('commonServices.clientId'),
    client_secret: config.get('commonServices.clientSecret'),
    scope: config.get('commonServices.scope'),
  };
  const formBody = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  const body = formBody.join('&');
  return (
    await axios({
      url: config.get('commonServices.tokenEndpoint'),
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
      maxRedirects: 35,
      data: body,
    })
  ).data.access_token;
};

/**
 * Get default drive id
 *
 * @returns default drive id
 */
async function getDriveId() {
  const token = await getToken();
  const { data } = await axios({
    url: 'https://ems-safe-dev.who.int/csapi/api/graphql/',
    method: 'post',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      query: `
            query {
              storagedrive(drivetype: 2) {
                 driveid
              }
           }
          `,
    },
  });
  return data.storagedrive.driveid;
}

/**
 * Upload given file to the document management system
 *
 * @param fileStream File data
 * @param fileName File name
 * @param driveId drive id
 * @returns response data
 */
async function uploadFile(
  fileStream: string,
  fileName: string,
  driveId: string
) {
  const body = {
    FileStream: fileStream,
    FileName: fileName,
  };
  const token = await getToken();
  const { data: response } = await axios({
    url: `https://hems-dev.who.int/csapi/api/documents/drives/${driveId}/items`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    data: body,
  });
  return response;
}

/**
 * Prepare given file for upload to the document management api
 *
 * @param file File
 * @returns File content ready to be pushed to the document management api
 */
async function handleFile(file) {
  let fileData = null;
  if (/^data:/i.test(file.content)) {
    fileData = file.content.toString().split(',')[1];
  } else if (!/^https:\/\/hems-dev.who.int/i.test(file.content)) {
    const blobName = file.content;
    const blobData = file.content.split('/')[1];
    const path = `files/${sanitize(blobData)}`;
    try {
      // Could happen that some blobs are now deleted or missing
      await downloadFile('forms', blobName, path);
      const response = await new Promise((resolve, reject) =>
        fs.readFile(path, async (err, data) => {
          if (err) {
            reject(err);
          }
          resolve(data.toString('base64').split(',')[1]);
        })
      );
      fileData = response;
      temporalLinks.push(path);
    } catch (error) {}
  }
  return fileData;
}

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  // Get all the resources that contain at least a field of type file, and extract the field names and resource id
  const resources = (
    await Resource.aggregate([
      {
        $match: {
          fields: { $elemMatch: { type: 'file' } },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          fieldNames: {
            $map: {
              input: {
                $filter: {
                  input: '$fields',
                  as: 'field',
                  cond: { $eq: ['$$field.type', 'file'] },
                },
              },
              as: 'fileField',
              in: '$$fileField.name',
            },
          },
        },
      },
    ])
  ).map((resource) => ({
    resourceId: resource._id,
    resourceName: resource.name,
    fieldNames: resource.fieldNames,
  }));

  let totalFiles = 0;
  let migratedFiles = 0;
  try {
    const driveId = await getDriveId();
    // For each resource, get all records for that resource id and that in their data property, at least the file type field exists
    await new Promise((resolve) => {
      resources.forEach(
        async ({ resourceId, resourceName, fieldNames }, indexResource) => {
          const query = {
            resource: resourceId,
            $or: fieldNames.map((fieldName) => ({
              [`data.${fieldName}`]: { $ne: null }, // Field exists and is not null
            })),
          };
          const records = await Record.find(query);
          const numberOfRecords = records.length;
          for (const [index, r] of records.entries()) {
            let filesToUpload = 0;
            for (
              let indexField = 0;
              indexField < fieldNames.length;
              indexField++
            ) {
              const field = fieldNames[indexField];
              /** Check which of the file fields exists in the given resource */
              if (r.data[field]) {
                if (Array.isArray(r.data[field])) {
                  const newFileField = [];
                  filesToUpload = r.data[field].length;
                  for (
                    let indexFile = 0;
                    indexFile < r.data[field].length;
                    indexFile++
                  ) {
                    let file = r.data[field][indexFile];
                    const fileData = await handleFile(file);
                    if (!isNil(fileData)) {
                      const { itemId } = await uploadFile(
                        fileData,
                        file.name,
                        driveId
                      );
                      file = {
                        ...file,
                        content: { itemId, driveId },
                      };
                      logger.info(
                        `Uploaded file ${
                          indexFile + 1
                        } of ${filesToUpload} for the record ${
                          index + 1
                        } of ${numberOfRecords} in ${resourceName}`
                      );
                      migratedFiles++;
                    }
                    newFileField.push(file);
                  }
                  r.data[field] = newFileField;
                } else {
                  filesToUpload = 1;
                  const fileData = await handleFile(r.data[field]);
                  if (!isNil(fileData)) {
                    // const { itemId } = await uploadFile(
                    //   fileData,
                    //   r.data[field].name,
                    //   driveId
                    // );
                    // r.data[field] = {
                    //   ...r.data[field],
                    //   content: { itemId, driveId },
                    // };
                    logger.info(
                      `Uploaded file ${filesToUpload} of ${filesToUpload} for the record ${
                        index + 1
                      } of ${numberOfRecords} in ${resourceName}`
                    );
                    migratedFiles++;
                  }
                }
              }
            }
            totalFiles += filesToUpload;
            r.save();
            logger.info(
              `Updated record ${
                index + 1
              } of ${numberOfRecords} in ${resourceName}`
            );
          }
          if (indexResource === resources.length - 1) {
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    logger.error(
      'Error trying to migrate all uploaded files to the document management system: ',
      error
    );
    /** Remove all temporal links for migrated files */
    temporalLinks.forEach((link, index) => {
      fs.unlink(link, () => {
        logger.info(
          `temporal file ${index + 1} of ${temporalLinks.length} removed`
        );
      });
    });
  }
  /** Remove all temporal links for migrated files */
  temporalLinks.forEach((link, index) => {
    fs.unlink(link, () => {
      logger.info(
        `temporal file ${index + 1} of ${temporalLinks.length} removed`
      );
    });
  });

  logger.info(`Migrated ${migratedFiles} files from ${totalFiles}`);
  logger.info(
    'If the migrated files number and total files is not the same, just execute the migration until they match. If they still does not match, could happen that some files are missing or corrupted'
  );
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
