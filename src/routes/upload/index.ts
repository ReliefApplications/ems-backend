import express from 'express';
import { Workbook } from 'exceljs';
import {
  Form,
  PositionAttribute,
  PositionAttributeCategory,
  Record,
  Role,
  Resource,
} from '@models';
import { AppAbility } from '@security/defineUserAbility';
import mongoose from 'mongoose';
import { getUploadColumns, loadRow } from '@utils/files';
import { getNextId } from '@utils/form';
import i18next from 'i18next';
import get from 'lodash/get';

/** File size limit, in bytes  */
const FILE_SIZE_LIMIT = 7 * 1024 * 1024;

/** Import data from user-uploaded files */
const router = express.Router();

/**
 * Insert records from file if authorized.
 *
 * @param res Request's response.
 * @param file File with records to insert.
 * @param form Form template for records.
 * @param fields Fields template for records.
 * @param context Context
 * @returns request with success status
 */
async function insertRecords(
  res: any,
  file: any,
  form: Form,
  fields: any[],
  context: any
) {
  // Check if the user is authorized
  const ability: AppAbility = context.user.ability;
  let canCreate = false;
  if (ability.can('create', 'Record')) {
    canCreate = true;
  } else {
    const roles = context.user.roles.map((x) => mongoose.Types.ObjectId(x._id));
    const canCreateRoles = get(
      form,
      'resource.permissions.canCreateRecords',
      []
    );
    canCreate =
      canCreateRoles.length > 0
        ? canCreateRoles.some((x) => roles.includes(x))
        : true;
  }
  // Check unicity of record
  // TODO: this is always breaking
  // if (form.permissions.recordsUnicity) {
  //     const unicityFilter = getRecordAccessFilter(form.permissions.recordsUnicity, Record, req.context.user);
  //     if (unicityFilter) {
  //         const uniqueRecordAlreadyExists = await Record.exists({ $and: [{ form: form._id }, unicityFilter] });
  //         canCreate = !uniqueRecordAlreadyExists;
  //     }
  // }
  if (canCreate) {
    const records: Record[] = [];
    const dataSets: { data: any; positionAttributes: PositionAttribute[] }[] =
      [];
    const workbook = new Workbook();
    await workbook.xlsx.load(file.data);
    const worksheet = workbook.getWorksheet(1);
    let columns = [];
    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
      const values = JSON.parse(JSON.stringify(row.values));
      if (rowNumber === 1) {
        columns = getUploadColumns(fields, values);
      } else {
        dataSets.push(loadRow(columns, values));
      }
    });
    // Create records one by one so the incrementalId works correctly
    for (const dataSet of dataSets) {
      records.push(
        new Record({
          incrementalId: await getNextId(
            String(form.resource ? form.resource : form.id)
          ),
          form: form.id,
          createdAt: new Date(),
          modifiedAt: new Date(),
          data: dataSet.data,
          resource: form.resource ? form.resource : null,
          createdBy: {
            positionAttributes: dataSet.positionAttributes,
          },
        })
      );
    }
    if (records.length > 0) {
      Record.insertMany(records, {}, async (err) => {
        if (err) {
          return res.status(500).send(err);
        } else {
          return res.status(200).send({ status: 'OK' });
        }
      });
    } else {
      return res.status(200).send({ status: 'No record added.' });
    }
  } else {
    return res.status(403).send(i18next.t('common.errors.dataNotFound'));
  }
}

/**
 * Import a list of records for a form from an uploaded xlsx file
 */
router.post('/form/records/:id', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).send(i18next.t('routes.upload.errors.missingFile'));
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT)
    return res
      .status(400)
      .send(i18next.t('common.errors.fileSizeLimitReached'));
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx')
    return res
      .status(400)
      .send(i18next.t('common.errors.fileExtensionNotAllowed'));

  const form = await Form.findById(req.params.id);

  // Check if the form exist
  if (!form)
    return res.status(404).send(i18next.t('common.errors.dataNotFound'));

  // Insert records if authorized
  return insertRecords(res, file, form, form.fields, req.context);
});

/**
 * Import a list of records for a resource from an uploaded xlsx file
 */
router.post('/resource/records/:id', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).send(i18next.t('routes.upload.errors.missingFile'));
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT)
    return res
      .status(400)
      .send(i18next.t('common.errors.fileSizeLimitReached'));
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx')
    return res
      .status(400)
      .send(i18next.t('common.errors.fileExtensionNotAllowed'));

  const form = await Form.findOne({ resource: req.params.id, core: true });
  const resource = await Resource.findById(req.params.id);
  // Check if the form and the resource exist
  if (!form || !resource)
    return res.status(404).send(i18next.t('common.errors.dataNotFound'));

  // Insert records if authorized
  return insertRecords(res, file, form, resource.fields, req.context);
});

/**
 * Import a list of users for an application from an uploaded xlsx file
 */
router.post('/application/:id/invite', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).send(i18next.t('routes.upload.errors.missingFile'));
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT)
    return res
      .status(400)
      .send(i18next.t('common.errors.fileSizeLimitReached'));
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx')
    return res
      .status(400)
      .send(i18next.t('common.errors.fileExtensionNotAllowed'));

  const roles = await Role.find({ application: req.params.id }).select(
    'id title'
  );
  const attributes = await PositionAttributeCategory.find({
    application: req.params.id,
  }).select('id title');
  const workbook = new Workbook();
  const data = [];
  await workbook.xlsx.load(file.data);
  let keys = [];
  const worksheet = workbook.getWorksheet(1);
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    const values = JSON.parse(JSON.stringify(row.values));
    if (rowNumber === 1) {
      keys = values;
    } else {
      const rawUser: any = {};
      keys.forEach((key, index) => {
        rawUser[`${key}`] = values[index];
      });
      const user = {
        email: '',
        role: [],
        positionAttributes: [],
      };
      if (rawUser.email && rawUser.role) {
        user.email = rawUser.email.text || rawUser.email;
        user.role = roles.find((x) => x.title === rawUser.role)._id || null;
        for (const attr of attributes) {
          const value = rawUser[attr.title] || null;
          user.positionAttributes.push({
            value,
            category: attr._id,
          });
        }
      } else {
        return res
          .status(400)
          .send(i18next.t('routes.upload.errors.invalidUserUpload'));
      }
      data.push(user);
    }
  });
  return res.status(200).send(data);
});

/**
 * Import a list of users for the platform from an uploaded xlsx file
 */
router.post('/invite', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0)
    return res.status(400).send(i18next.t('routes.upload.errors.missingFile'));
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT)
    return res
      .status(400)
      .send(i18next.t('common.errors.fileSizeLimitReached'));
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx')
    return res
      .status(400)
      .send(i18next.t('common.errors.fileExtensionNotAllowed'));

  const roles = await Role.find({ application: null }).select('id title');
  const workbook = new Workbook();
  const data = [];
  await workbook.xlsx.load(file.data);
  let keys = [];
  const worksheet = workbook.getWorksheet(1);
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    const values = JSON.parse(JSON.stringify(row.values));
    if (rowNumber === 1) {
      keys = values;
    } else {
      const rawUser: any = {};
      keys.forEach((key, index) => {
        rawUser[`${key}`] = values[index];
      });
      const user = {
        email: '',
        role: [],
        positionAttributes: [],
      };
      if (rawUser.email && rawUser.role) {
        user.email = rawUser.email.text || rawUser.email;
        user.role = roles.find((x) => x.title === rawUser.role)._id || null;
      } else {
        return res
          .status(400)
          .send(i18next.t('routes.upload.errors.invalidUserUpload'));
      }
      data.push(user);
    }
  });
  return res.status(200).send(data);
});

export default router;
