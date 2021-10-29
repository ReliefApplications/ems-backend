import express from 'express';
import { Workbook } from 'exceljs';
import { Form, PositionAttributeCategory, Record, Role } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';
// import { getRecordAccessFilter } from '../../utils/filter';
import { getUploadColumns, loadRow } from '../../utils/files';

const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const router = express.Router();
/**
 * Upload file with data
 * */
router.post('/form/records/:id', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0) return res.status(400).send(errors.missingFile);
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT) return res.status(400).send(errors.fileSizeLimitReached);
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx') return res.status(400).send(errors.fileExtensionNotAllowed);

  const ability: AppAbility = req.context.user.ability;
  const form = await Form.findById(req.params.id);

  // Check if the form exist
  if (!form) return res.status(404).send(errors.dataNotFound);
  let canCreate = false;
  if (ability.can('create', 'Record')) {
    canCreate = true;
  } else {
    const roles = req.context.user.roles.map(x => mongoose.Types.ObjectId(x._id));
    canCreate = form.permissions.canCreateRecords.length > 0 ? form.permissions.canCreateRecords.some(x => roles.includes(x)) : true;
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
    const workbook = new Workbook();
    workbook.xlsx.load(file.data).then(() => {
      const worksheet = workbook.getWorksheet(1);
      let columns = [];
      worksheet.eachRow({ includeEmpty: true }, function (row, rowNumber) {
        const values = JSON.parse(JSON.stringify(row.values));
        if (rowNumber === 1) {
          columns = getUploadColumns(form.fields, values);
        } else {
          const { data, positionAttributes } = loadRow(columns, values);
          records.push(new Record({
            form: form.id,
            createdAt: new Date(),
            modifiedAt: new Date(),
            data: data,
            resource: form.resource ? form.resource : null,
            createdBy: {
              positionAttributes,
            },
          }));
        }
      });
      if (records.length > 0) {
        Record.insertMany(records, {}, async () => {
          return res.status(200).send({ status: 'OK' });
        });
      } else {
        return res.status(200).send({ status: '' });
      }
    });
  } else {
    return res.status(403).send(errors.dataNotFound);
  }
});

router.post('/application/:id/invite', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0) return res.status(400).send(errors.missingFile);
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT) return res.status(400).send(errors.fileSizeLimitReached);
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx') return res.status(400).send(errors.fileExtensionNotAllowed);

  const roles = await Role.find({ application: req.params.id }).select('id title');
  const attributes = await PositionAttributeCategory.find({ application: req.params.id }).select('id title');
  const workbook = new Workbook();
  const data = [];
  await workbook.xlsx.load(file.data);
  let keys = [];
  const worksheet = workbook.getWorksheet(1);
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    const values = Object.values(row.values);
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
      user.email = rawUser.email.text || rawUser.email;
      user.role = roles.find(x => x.title === rawUser.role)._id || null;
      for (const attr of attributes) {
        const value = rawUser[attr.title] || null;
        user.positionAttributes.push({
          value,
          category: attr._id,
        });
      }
      data.push(user);
    }
  });
  res.status(200).send(data);
});

router.post('/invite', async (req: any, res) => {
  // Check file
  if (!req.files || Object.keys(req.files).length === 0) return res.status(400).send(errors.missingFile);
  // Get the file from request
  const file = req.files.excelFile;
  // Check file size
  if (file.size > FILE_SIZE_LIMIT) return res.status(400).send(errors.fileSizeLimitReached);
  // Check file extension (only allowed .xlsx)
  if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx') return res.status(400).send(errors.fileExtensionNotAllowed);

  const roles = await Role.find({ application: null }).select('id title');
  const workbook = new Workbook();
  const data = [];
  await workbook.xlsx.load(file.data);
  let keys = [];
  const worksheet = workbook.getWorksheet(1);
  worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
    const values = Object.values(row.values);
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
      user.email = rawUser.email.text || rawUser.email;
      user.role = roles.find(x => x.title === rawUser.role)._id || null;
      data.push(user);
    }
  });
  res.status(200).send(data);
});

export default router;
