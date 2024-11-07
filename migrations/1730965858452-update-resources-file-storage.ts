import { Record } from '@models';
import { Resource } from '@models/resource.model';
import { logger } from '@services/logger.service';
import { downloadFile } from '@utils/files/downloadFile';
import { getToken } from '@utils/gis/getCountryPolygons';
import axios from 'axios';
import fs from 'fs';
import { isNil } from 'lodash';
import sanitize from 'sanitize-filename';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Temporal links for files */
const temporalLinks = [];

/** Migration description */
export const description =
  'Update resources files storage from blob storage to the document management system';

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
    resources.forEach(async ({ resourceId, resourceName, fieldNames }) => {
      const query = {
        resource: resourceId,
        $or: fieldNames.map((fieldName) => ({
          [`data.${fieldName}`]: { $ne: null }, // Field exists and is not null
        })),
      };
      const records = await Record.find(query);
      const numberOfRecords = records.length;
      records.forEach((r, index) => {
        let filesToUpload = 0;
        if (index == 0) {
          fieldNames.forEach(async (field) => {
            /** Check which of the file fields exists in the given resource */
            if (r.data[field]) {
              if (Array.isArray(r.data[field])) {
                filesToUpload = r.data[field].length;
                const newFieldFile = r.data[field].map(
                  async (file, fileIndex) => {
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
                          fileIndex + 1
                        } of ${filesToUpload} for the record ${
                          index + 1
                        } of ${numberOfRecords} in ${resourceName}`
                      );
                      migratedFiles++;
                    }
                    return file;
                  }
                );
                r.data[field] = newFieldFile;
              } else {
                filesToUpload = 1;
                const fileData = await handleFile(r.data[field]);
                if (!isNil(fileData)) {
                  const { itemId } = await uploadFile(
                    fileData,
                    r.data[field].name,
                    driveId
                  );
                  r.data[field] = {
                    ...r.data[field],
                    content: { itemId, driveId },
                  };
                  logger.info(
                    `Uploaded file ${filesToUpload} of ${filesToUpload} for the record ${
                      index + 1
                    } of ${numberOfRecords} in ${resourceName}`
                  );
                  migratedFiles++;
                }
              }
            }
          });
          totalFiles += filesToUpload;
          r.save();
          logger.info(
            `Updated record ${
              index + 1
            } of ${numberOfRecords} in ${resourceName}`
          );
        }
      });
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
