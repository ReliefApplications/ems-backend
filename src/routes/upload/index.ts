import express from 'express';
import { Workbook } from 'exceljs';
import {
  Form,
  PositionAttribute,
  PositionAttributeCategory,
  Record,
  Role,
  Resource,
  Version,
  Application,
} from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { Types } from 'mongoose';
import { getUploadColumns, loadRow, uploadFile } from '@utils/files';
import { getNextId, getOwnership, transformRecord } from '@utils/form';
import i18next from 'i18next';
import get from 'lodash/get';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/** File size limit, in bytes  */
const FILE_SIZE_LIMIT = 7 * 1024 * 1024;

/** Import data from user-uploaded files */
const router = express.Router();

/** Interface of DataSet */
export type DataSet = {
  data: any;
  positionAttributes: PositionAttribute[];
  id: string | null;
};

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
    const roles = context.user.roles.map((x) => new Types.ObjectId(x._id));
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
  const canUpdate = ability.can('update', 'Record');
  // Check unicity of record
  // TODO: this is always breaking
  // if (form.permissions.recordsUnicity) {
  //     const unicityFilter = getRecordAccessFilter(form.permissions.recordsUnicity, Record, req.context.user);
  //     if (unicityFilter) {
  //         const uniqueRecordAlreadyExists = await Record.exists({ $and: [{ form: form._id }, unicityFilter] });
  //         canCreate = !uniqueRecordAlreadyExists;
  //     }
  // }
  if (canCreate && canUpdate) {
    const newRecords: Record[] = [];
    const promises = [];
    const workbook = new Workbook();
    await workbook.xlsx.load(file.data);
    const worksheet = workbook.getWorksheet(1);
    let columns = [];
    // To checks if should update old or add new records
    const newRecordsData: DataSet[] = [];
    const oldRecordsData: DataSet[] = [];
    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
      const values = JSON.parse(JSON.stringify(row.values));
      if (rowNumber === 1) {
        columns = getUploadColumns(fields, values);
      } else {
        const loadedRow = loadRow(columns, values);
        if (!loadedRow.id) newRecordsData.push(loadedRow);
        else oldRecordsData.push(loadedRow);
      }
    });

    // If has record to update
    if (oldRecordsData.length) {
      const oldRecordsIds: string[] = oldRecordsData.map(
        (record: DataSet) => record.id
      );
      const oldRecords = await Record.find({
        incrementalId: { $in: oldRecordsIds },
        form: form.id,
        archived: { $ne: true },
      });
      // If record Id don't exist, put not found record in the newRecordsData array to create record
      if (oldRecords.length !== oldRecordsIds.length) {
        oldRecordsIds.forEach((id: string) => {
          const existRecord = oldRecords.find(
            (record) => record.incrementalId === id
          );
          if (!existRecord) {
            newRecordsData.push(
              ...oldRecordsData.splice(
                oldRecordsData.findIndex((record) => record.id === id),
                1
              )
            );
          }
        });
      }
      // Init array to bulkWrite update operation
      const bulkUpdate = [];
      // Get template fields
      let template: Form | Resource;
      if (form.resource) {
        template = await Resource.findById(form.resource, 'fields');
      } else {
        template = form;
      }
      // update records that were uploaded with a valid ID
      for (const updatedRecordData of oldRecordsData) {
        const oldRecord = oldRecords.find(
          (rec) => rec.incrementalId === updatedRecordData.id
        );
        const version = new Version({
          createdAt: oldRecord.modifiedAt
            ? oldRecord.modifiedAt
            : oldRecord.createdAt,
          data: oldRecord.data,
          createdBy: context.user.id,
        });
        await transformRecord(updatedRecordData.data, template.fields);
        const update: any = {
          data: { ...oldRecord.data, ...updatedRecordData.data },
          modifiedAt: new Date(),
          $push: { versions: version._id },
        };
        const ownership = getOwnership(template.fields, updatedRecordData.data);
        Object.assign(
          update,
          ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
        );
        bulkUpdate.push({
          updateOne: {
            filter: { _id: new Types.ObjectId(oldRecord.id) },
            update,
          },
        });
        promises.push(version.save());
      }
      // Sends multiple `updateOne` operations to the MongoDB in one command (this is faster than sending multiple independent operations)
      Record.bulkWrite(bulkUpdate);
    }
    // Create records one by one so the incrementalId works correctly
    for (const dataSet of newRecordsData) {
      newRecords.push(
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
            user: context.user._id,
          },
          lastUpdateForm: form.id,
          _createdBy: {
            user: {
              _id: context.user._id,
              name: context.user.name,
              username: context.user.username,
            },
          },
          _form: {
            _id: form._id,
            name: form.name,
          },
          _lastUpdateForm: {
            _id: form._id,
            name: form.name,
          },
        })
      );
    }
    if (newRecords.length > 0) {
      promises.push(Record.insertMany(newRecords));
    }
    // If no new data, return
    if (newRecords.length + oldRecordsData.length === 0) {
      return res.status(200).send({ status: 'No record added.' });
    }
    // Resolve all promises and return
    try {
      await Promise.all(promises);
      return res.status(200).send({ status: 'OK' });
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      return res
        .status(500)
        .send(i18next.t('common.errors.internalServerError'));
    }
  } else {
    return res.status(403).send(i18next.t('common.errors.dataNotFound'));
  }
}

/**
 * Import a list of records for a form from an uploaded xlsx file
 */
router.post('/form/records/:id', async (req: any, res) => {
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
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
    return await insertRecords(res, file, form, form.fields, req.context);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Import a list of records for a resource from an uploaded xlsx file
 */
router.post('/resource/records/:id', async (req: any, res) => {
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
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
    return await insertRecords(res, file, form, resource.fields, req.context);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Import a list of users for an application from an uploaded xlsx file
 */
router.post('/application/:id/invite', async (req: any, res) => {
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
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
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Import a list of users for the platform from an uploaded xlsx file
 */
router.post('/invite', async (req: any, res) => {
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
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
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/** Uploads file from a certain form to azure storage */
router.post('/file/:form', async (req, res) => {
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
    const file = Array.isArray(req.files.file)
      ? req.files.file[0]
      : req.files.file;

    // Check file size
    if (file.size > FILE_SIZE_LIMIT) {
      return res
        .status(400)
        .send(i18next.t('common.errors.fileSizeLimitReached'));
    }

    // Check form
    const formID = req.params.form;
    const form = await Form.exists({ _id: formID });
    if (!form) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const path = await uploadFile('forms', formID, file);
    return res.status(200).send({ path });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/** Uploads stylesheet file of a specified application to azure storage */
router.post('/style/:application', async (req, res) => {
  const context = req.context;
  try {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0)
      return res
        .status(400)
        .send(i18next.t('routes.upload.errors.missingFile'));
    const file = Array.isArray(req.files.file)
      ? req.files.file[0]
      : req.files.file;

    // Check file size
    if (file.size > FILE_SIZE_LIMIT) {
      return res
        .status(400)
        .send(i18next.t('common.errors.fileSizeLimitReached'));
    }
    // Authentication check
    const user = context.user;
    if (!user) {
      return res.status(401).send(i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    const filters = Application.find(
      accessibleBy(ability, 'update').Application
    )
      .where({ _id: req.params.application })
      .getFilter();

    const application = await Application.findOne(filters);
    if (!application) {
      return res
        .status(403)
        .send(i18next.t('common.errors.permissionNotGranted'));
    }
    const path = await uploadFile(
      'applications',
      req.params.application,
      file,
      {
        filename: application.cssFilename,
        allowedExtensions: ['css', 'scss'],
      }
    );

    await Application.updateOne(
      { _id: req.params.application },
      { cssFilename: path }
    );

    return res.status(200).send({ path });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
