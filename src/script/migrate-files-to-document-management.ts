import { Form, Record, Resource } from '@models';
import { startDatabase } from '@server/database';
import axios from 'axios';
import { Types } from 'mongoose';
import config from 'config';
import sanitize from 'sanitize-filename';
import { downloadFile } from '@utils/files/downloadFile';
import fs from 'fs';
import get from 'lodash/get';

const method = process.argv[2];
const resourceIdInput = process.argv[3];
// Stringified JSON context, put between ' ', for example: {"DocumentType": [27]}
const context = process.argv[4];

const tokenInput = process.argv[5];

const temporalLinks = [];

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

const getDriveId = async (token: string) => {
  const { data } = await axios({
    url: config.get('commonServices.url') + 'graphql',
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
  return data.data.storagedrive.driveid;
};

const uploadFile = async (
  token: string,
  fileStream: string,
  fileName: string,
  driveId: string,
  properties: any
) => {
  const body = {
    FileStream: fileStream,
    FileName: fileName,
    ...properties,
  };
  let result = null;
  await axios({
    url: `${config.get('commonServices.url')}documents/drives/${driveId}/items`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    data: body,
  })
    .then((response) => {
      console.log('File uploaded');
      result = response.data;
    })
    .catch((error) => {
      // console.log(error);
      console.error(error.message);
      console.log(error.response.data.error);
    });
  return result;
};

const handleFile = async (file) => {
  let fileData = null;
  if (file.content && typeof file.content === 'string') {
    if (/^data:/i.test(file.content)) {
      // Data is stored in the field directly
      fileData = file.content.toString().split(',')[1];
    } else {
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
            // data.toString('base64').split(',')[1];
            resolve(data.toString('base64'));
          })
        );
        fileData = response;
        temporalLinks.push(path);
      } catch (error) {}
    }
  }
  return fileData;
};

export const listResources = async () => {
  const resources = await Resource.aggregate([
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
  ]);
  for (const resource of resources) {
    console.log('=== === ===');
    console.log('ID: ', resource._id);
    console.log('Name: ', resource.name);
    console.log('Fields: ', resource.fieldNames);
  }
  return;
};

const updateFormRecords = async (form: Form, fieldNames: string[]) => {
  const records = await Record.find({
    form: new Types.ObjectId(form._id),
    $or: fieldNames.map((fieldName) => ({
      [`data.${fieldName}`]: { $exists: true, $ne: null },
    })),
  });
  const token = tokenInput ? tokenInput : await getToken();
  const driveId = await getDriveId(token);
  for (const fieldName of fieldNames) {
    const field = form.fields.find((x) => x.name === fieldName);
    if (field) {
      for (const record of records) {
        let needSave = false;
        const value = get(record, `data.${fieldName}`);
        if (value) {
          for (const file of value) {
            const content = await handleFile(file);
            if (content) {
              const { itemId } = await uploadFile(
                token,
                content,
                file.name,
                driveId,
                JSON.parse(context)
              );
              if (itemId) {
                file.content = {
                  driveId,
                  itemId,
                };
                record.markModified(`data.${fieldName}`);
                needSave = true;
              }
            }
          }
          if (needSave) {
            console.log(record.data);
            await record.save({ timestamps: false });
            console.log('Saved record: ', record._id);
          }
        }
      }
    }
  }
};

const updateResource = async (resourceId: string) => {
  const resource = (
    await Resource.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(resourceId),
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
  )[0];
  const forms = await Form.find({
    resource: new Types.ObjectId(resourceId),
  });
  for (const form of forms) {
    await updateFormRecords(form, resource.fieldNames);
  }
  return;
};

if (method === 'listResources') {
  (async () => {
    await startDatabase();
    await listResources();
  })();
}

if (method === 'updateResource') {
  (async () => {
    if (!resourceIdInput) {
      console.error('Please provide a resource ID.');
      return;
    }
    await startDatabase();
    await updateResource(resourceIdInput);
  })();
}
