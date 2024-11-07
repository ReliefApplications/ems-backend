import { Resource } from '@models/resource.model';
import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { logger } from '@services/logger.service';
import { Record } from '@models';
import { downloadFile } from '@utils/files/downloadFile';
import sanitize from 'sanitize-filename';
import axios from 'axios';
import { getToken } from '@utils/gis/getCountryPolygons';

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

function transformFileToValidInput(file: any) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    (fileReader as any).onload = () => {
      resolve(fileReader.result?.toString().split(',')[1]);
    };
    (fileReader as any).onerror = (error: any) => {
      reject(error);
    };
    fileReader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  let fileData = null;
  if (/^data:/i.test(file.content)) {
    fileData = await transformFileToValidInput(file.content);
  } else if (!/^https:\/\/hems-dev.who.int/i.test(file.content)) {
    const blobName = file.content;
    const blobData = file.content.split('/')[1];
    const path = `files/${sanitize(blobData)}`;
    fileData = await downloadFile('forms', blobName, path);
  }
  return fileData;
}

async function uploadFile(fileData: File, driveId: string) {
  const body = {
    FileStream: fileData.stream(),
    FileName: fileData.name,
  };
  const token = await getToken();
  axios({
    url: `https://hems-dev.who.int/csapi/api/documents/drives/${driveId}/items`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    data: body,
  });
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
  const bulkWriteRecords = [];
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
    //  if (resourceName === 'Signal Management Feedback') {
    records.forEach((r, index) => {
      if (index == 0) {
        fieldNames.forEach(async (field) => {
          if (r.data[field]) {
            if (Array.isArray(r.data[field])) {
              r.data[field].forEach(async (file) => {
                const fileData = await handleFile(file);
                console.log('file obj: ', file);
                console.log('generated file to upload: ', fileData);
                //   await uploadFile(fileData, driveId);
              });
            } else {
              const fileData = await handleFile(r.data[field]);
              console.log('file obj: ', r.data[field]);
              console.log('generated file to upload: ', fileData);
              // await uploadFile(fileData, driveId);
            }
          }
        });
      }
    });
    //  bulkWriteRecords.push(...records);
    //  }
  });

  //   for (const resource of resourceMap.entries()) {
  //     const canSeeRecords = resource.permissions.canSeeRecords;
  //     const canDownloadRecords = cloneDeep(canSeeRecords).map((x) =>
  //       omit(x.toObject(), ['access'])
  //     );
  //     const permissions = {
  //       ...resource.permissions,
  //       canDownloadRecords,
  //     };
  //     bulkUpdate.push({
  //       updateOne: {
  //         filter: { _id: resource._id },
  //         update: {
  //           permissions,
  //         },
  //       },
  //     });
  //   }

  //   try {
  //     logger.info(
  //       'Updating resources files storage to the new document management system'
  //     );
  //     await Record.bulkWrite(bulkUpdate);
  //   } catch (e) {
  //     logger.error(
  //       'Error trying to update the blob storage file to the document management system: ',
  //       e
  //     );
  //   }
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
