import express from 'express';
import errors from '../../const/errors';
import {
  Form,
  Record,
  Resource,
  Application,
  Role,
  PositionAttributeCategory,
  User,
} from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import fs from 'fs';
import {
  fileBuilder,
  downloadFile,
  templateBuilder,
  getColumns,
  getRows,
  extractGridData,
} from '../../utils/files';
import xlsBuilder from '../../utils/files/xlsBuilder';
import csvBuilder from '../../utils/files/csvBuilder';
import { TRANSPORT_OPTIONS, EMAIL_FROM, EMAIL_REPLY_TO } from '../email';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';
import * as nodemailer from 'nodemailer';

/**
 * Exports files in csv or xlsx format, excepted if specified otherwised
 */
const router = express.Router();

/**
 * Export the records of a form, or the template to upload new ones.
 * Query must contain the export format
 * Query must contain a template parameter if that is what we want to export
 */
router.get('/form/records/:id', async (req, res) => {
  // Get the form from its ID if it's accessible to the user
  const ability: AppAbility = req.context.user.ability;
  const filters = Form.accessibleBy(ability, 'read')
    .where({ _id: req.params.id })
    .getFilter();
  const form = await Form.findOne(filters);

  if (form) {
    let records = [];
    let permissionFilters = [];
    let filter = {};
    if (
      ability.cannot('read', 'Record') &&
      form.permissions.canSeeRecords.length > 0
    ) {
      permissionFilters = getFormPermissionFilter(
        req.context.user,
        form,
        'canSeeRecords'
      );
      if (permissionFilters.length) {
        filter = {
          $and: [{ form: req.params.id }, { $or: permissionFilters }],
          archived: { $ne: true },
        };
      }
    } else {
      filter = { form: req.params.id, archived: { $ne: true } };
    }
    records = await Record.find(filter);
    const columns = await getColumns(
      form.fields,
      '',
      req.query.template ? true : false
    );
    // If the export is only of a template, build and export it, else build and export a file with the records
    if (req.query.template) {
      return templateBuilder(res, form.name, columns);
    } else {
      const rows = await getRows(columns, records);
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, form.name, columns, rows, type);
    }
  } else {
    res.status(404).send(errors.dataNotFound);
  }
});

/**
 * Export versions of a record
 * Query must contain the export format
 */
router.get('/form/records/:id/history', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const recordFilters = Record.accessibleBy(ability, 'read')
    .where({ _id: req.params.id, archived: { $ne: true } })
    .getFilter();
  const record = await Record.findOne(recordFilters)
    .populate({
      path: 'versions',
      populate: {
        path: 'createdBy',
        model: 'User',
      },
    })
    .populate({
      path: 'createdBy.user',
      model: 'User',
    });
  const formFilters = Form.accessibleBy(ability, 'read')
    .where({ _id: record.form })
    .getFilter();
  const form = await Form.findOne(formFilters);
  if (form) {
    const columns = await getColumns(form.fields, req.headers.authorization);
    const type = (req.query ? req.query.type : 'xlsx').toString();
    const data = [];
    record.versions.forEach((version) => {
      const temp = version.data;
      temp['Modification date'] = version.createdAt;
      temp['Created by'] = version.createdBy?.username;
      data.push(temp);
    });
    const currentVersion = record.data;
    currentVersion['Modification date'] = record.modifiedAt;
    currentVersion['Created by'] = record.createdBy?.user?.username || null;
    data.push(record.data);
    columns.push({ name: 'Modification date' });
    columns.push({ name: 'Created by' });
    return fileBuilder(res, record.id, columns, data, type);
  } else {
    res.status(404).send(errors.dataNotFound);
  }
});

/**
 * Export the records of a resource, or the template to upload new ones.
 */
router.get('/resource/records/:id', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const filters = Resource.accessibleBy(ability, 'read')
    .where({ _id: req.params.id })
    .getFilter();
  const resource = await Resource.findOne(filters);

  if (resource) {
    let records = [];
    if (ability.can('read', 'Record')) {
      records = await Record.find({
        resource: req.params.id,
        archived: { $ne: true },
      });
    }
    const columns = await getColumns(
      resource.fields,
      req.headers.authorization,
      req.query.template ? true : false
    );
    if (req.query.template) {
      return templateBuilder(res, resource.name, columns);
    } else {
      const rows = await getRows(columns, records);
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, resource.name, columns, rows, type);
    }
  } else {
    res.status(404).send(errors.dataNotFound);
  }
});

/**
 * Export a list of records from a grid
 *
 * The parameters are :
 * params = {
 *    ids?: string[],                     // If exportOptions.records === 'selected', list of ids of the records
 *    fields?: any[],                     // If exportOptions.fields === 'displayed', list of the names of the fields we want to export
 *    filter?: any                        // If any set, list of the filters we want to apply
 *    format: 'csv' | 'xlsx'              // Export on csv or excel format
 *    application: string                 // Name of the application triggering the export
 *    fileName: string                    // Name for the file
 *    email: boolean                      // Send the file by email
 *    query: any                          // Query parameters to build it
 *    sortField?: string
 *    sortOrder?: 'asc' | 'desc'
 * }
 */
router.post('/records', async (req, res) => {
  const params = req.body;

  // Send res accordingly to parameters
  if (!params.fields || !params.query) {
    return res.status(400).send('Missing parameters');
  }

  // Initialization
  let columns: any[];
  let rows: any[];

  // Make distinction if we send the file by email or in the response
  if (!params.email) {
    // Fetch data
    await extractGridData(params, req.headers.authorization)
      .then((x) => {
        columns = x.columns;
        rows = x.rows;
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Export failed');
      });
    // Returns the file
    return fileBuilder(res, 'records', columns, rows, params.format);
  } else {
    // Send response so the client is not frozen
    res.status(200).send('Export ongoing');
    // Fetch data
    await extractGridData(params, req.headers.authorization)
      .then((x) => {
        columns = x.columns;
        rows = x.rows;
      })
      .catch((err) => {
        console.error(err);
      });
    // Build the file
    let file: any;
    switch (params.format) {
      case 'xlsx':
        file = await xlsBuilder('records', columns, rows);
        break;
      case 'csv':
        file = csvBuilder(columns, rows);
    }
    // Pass it in attachment
    const attachments = [
      {
        filename: `${params.fileName}.${params.format}`,
        content: file,
      },
    ];
    // Create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(TRANSPORT_OPTIONS);
    // Send mail
    try {
      transporter
        .sendMail({
          from: EMAIL_FROM,
          to: req.context.user.username,
          subject: `${params.application} - Your data export is completed - ${params.fileName}`,
          text: 'Dear colleague,\n\nPlease find attached to this e-mail the requested data export.\n\nFor any issues with the data export, please contact ems2@who.int\n\n Best regards,\nems2@who.int',
          attachments,
          replyTo: EMAIL_REPLY_TO,
        })
        .then((info) => {
          if (!info.messageId) {
            throw new Error('Unexpected email sending response');
          }
        });
    } catch (err) {
      console.log(err);
    }
  }
});

/**
 * Export the template to add new users to an application by uploading a file
 */
router.get('/application/:id/invite', async (req, res) => {
  const application = await Application.findById(req.params.id);
  const roles = await Role.find({ application: application._id });
  const attributes = await PositionAttributeCategory.find({
    application: application._id,
  }).select('title');
  const fields = [
    {
      name: 'email',
    },
    {
      name: 'role',
      meta: {
        type: 'list',
        allowBlank: true,
        options: roles.map((x) => x.title),
      },
    },
  ];
  attributes.forEach((x) => fields.push({ name: x.title }));
  return templateBuilder(res, `${application.name}-users`, fields);
});

/**
 * Export the template to add new users to the platform by uploading a file
 */
router.get('/invite', async (req, res) => {
  const roles = await Role.find({ application: null });
  const fields = [
    {
      name: 'email',
    },
    {
      name: 'role',
      meta: {
        type: 'list',
        allowBlank: true,
        options: roles.map((x) => x.title),
      },
    },
  ];
  return templateBuilder(res, 'users', fields);
});

/**
 * Export all users of the platform
 */
router.get('/users', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  if (ability.can('read', 'User')) {
    const users: any[] = await User.find({}).populate({
      path: 'roles',
      match: { application: { $eq: null } },
    });
    const rows = users.map((x: any) => {
      return {
        username: x.username,
        name: x.name,
        roles: x.roles.map((role) => role.title).join(', '),
      };
    });
    if (rows) {
      const columns = [
        { name: 'username', title: 'Username', field: 'username' },
        { name: 'name', title: 'Name', field: 'name' },
        { name: 'roles', title: 'Roles', field: 'roles' },
      ];
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, 'users', columns, rows, type);
    }
  }
  res.status(404).send(errors.dataNotFound);
});

/**
 * Export the users of a specific application
 */
router.get('/application/:id/users', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  if (ability.can('read', 'User')) {
    const aggregations = [
      // Left join
      {
        $lookup: {
          from: 'roles',
          localField: 'roles',
          foreignField: '_id',
          as: 'roles',
        },
      },
      // Replace the roles field with a filtered array, containing only roles that are part of the application.
      {
        $addFields: {
          roles: {
            $filter: {
              input: '$roles',
              as: 'role',
              cond: {
                $eq: [
                  '$$role.application',
                  mongoose.Types.ObjectId(req.params.id),
                ],
              },
            },
          },
        },
      },
      // Filter users that have at least one role in the application.
      { $match: { 'roles.0': { $exists: true } } },
    ];
    const users = await User.aggregate(aggregations);
    const rows = users.map((x: any) => {
      return {
        username: x.username,
        name: x.name,
        roles: x.roles.map((role) => role.title).join(', '),
      };
    });

    if (rows) {
      const columns = [
        { name: 'username', title: 'Username', field: 'username' },
        { name: 'name', title: 'Name', field: 'name' },
        { name: 'roles', title: 'Roles', field: 'roles' },
      ];
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, 'users', columns, rows, type);
    }
  }
  res.status(404).send(errors.dataNotFound);
});

/**
 * Export another type of file
 */
router.get('/file/:form/:blob', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const form: Form = await Form.findById(req.params.form);
  if (!form) {
    res.status(404).send(errors.dataNotFound);
  }
  if (ability.cannot('read', form)) {
    res.status(403).send(errors.permissionNotGranted);
  }
  const blobName = `${req.params.form}/${req.params.blob}`;
  const path = `files/${sanitize(req.params.blob)}`;
  await downloadFile('forms', blobName, path);
  res.download(path, () => {
    fs.unlink(path, () => {
      console.log('file deleted');
    });
  });
});

export default router;
