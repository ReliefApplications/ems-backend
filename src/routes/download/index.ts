import express from 'express';
import {
  Form,
  Record,
  Resource,
  Application,
  Role,
  PositionAttributeCategory,
  User,
  RecordHistoryMeta,
  RecordHistory as RecordHistoryType,
} from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import fs from 'fs';
import {
  fileBuilder,
  downloadFile,
  templateBuilder,
  getColumns,
  getRows,
  historyFileBuilder,
} from '@utils/files';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';
import i18next from 'i18next';
import { RecordHistory } from '@utils/history';
import { logger } from '../../services/logger.service';
import { getAccessibleFields } from '@utils/form';
import { formatFilename } from '@utils/files/format.helper';
import { sendEmail } from '@utils/email';
import exportBatch from '@utils/files/exportBatch';

/**
 * Exports files in csv or xlsx format, excepted if specified otherwise
 */
const router = express.Router();

/**
 * Build user export file
 *
 * @param req current http request
 * @param res http response
 * @param users list of users to serialize
 * @returns User export file
 */
const buildUserExport = (req, res, users) => {
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
  } else {
    return false;
  }
};

/**
 * Get list of fields for user template file
 *
 * @param roles list of roles
 * @returns list of template fields
 */
const getUserTemplateFields = (roles: Role[]) => {
  return [
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
};

/**
 * Export the records of a form, or the template to upload new ones.
 * Query must contain the export format
 * Query must contain a template parameter if that is what we want to export
 */
router.get('/form/records/:id', async (req, res) => {
  try {
    // Get the form from its ID if it's accessible to the user
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read')
      .where({ _id: req.params.id })
      .getFilter();
    const form = await Form.findOne(filters);

    if (form) {
      const formAbility = await extendAbilityForRecords(req.context.user, form);
      const filter = {
        form: req.params.id,
        archived: { $ne: true },
        ...Record.accessibleBy(formAbility, 'read').getFilter(),
      };
      const records = await Record.find(filter);
      const columns = await getColumns(
        form.fields,
        '',
        req.query.template ? true : false
      );
      // If the export is only of a template, build and export it, else build and export a file with the records
      if (req.query.template) {
        return await templateBuilder(res, form.name, columns);
      } else {
        const rows = await getRows(
          columns,
          getAccessibleFields(records, formAbility)
        );
        const type = (req.query ? req.query.type : 'xlsx').toString();
        const filename = formatFilename(form.name);
        return await fileBuilder(res, filename, columns, rows, type);
      }
    } else {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export versions of a record
 * Query must contain the export format
 * Query may also contain date (epoch notation) and field filters
 */
router.get('/form/records/:id/history', async (req, res) => {
  try {
    // localization
    await req.i18n.changeLanguage(req.language);
    const dateLocale = req.query.dateLocale.toString();
    const ability: AppAbility = req.context.user.ability;
    // setting up filters
    let filters: {
      fromDate?: Date;
      toDate?: Date;
      fields?: string[];
    } = {};
    if (req.query) {
      const { from, to, fields } = req.query as any;
      filters = Object.assign(
        {},
        from === 'NaN' ? null : { fromDate: new Date(parseInt(from, 10)) },
        to === 'NaN' ? null : { toDate: new Date(parseInt(to, 10)) },
        !fields ? null : { fields: fields.split(',') }
      );

      if (filters.toDate) filters.toDate.setDate(filters.toDate.getDate() + 1);
    }

    const recordFilters = Record.accessibleBy(ability, 'read')
      .where({ _id: req.params.id, archived: { $ne: true } })
      .getFilter();
    const record: Record = await Record.findOne(recordFilters)
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
    const form = await Form.findOne(formFilters).populate({
      path: 'resource',
      model: 'Resource',
    });
    if (form) {
      record.form = form;
      const meta: RecordHistoryMeta = {
        form: form.name,
        record: record.incrementalId,
        fields: filters.fields?.join(',') || '',
        fromDate: filters.fromDate
          ? filters.fromDate.toLocaleDateString(dateLocale)
          : '',
        toDate: filters.toDate
          ? filters.toDate.toLocaleDateString(dateLocale)
          : '',
        exportDate: new Date().toLocaleDateString(dateLocale),
      };
      const unfilteredHistory: RecordHistoryType = await new RecordHistory(
        record,
        {
          translate: req.t,
          ability,
        }
      ).getHistory();
      const fields = filters.fields;
      const history = unfilteredHistory
        .filter((version) => {
          let isInDateRange = true;
          // filtering by date
          const date = new Date(version.createdAt);
          if (filters.fromDate && filters.fromDate > date)
            isInDateRange = false;
          if (filters.toDate && filters.toDate < date) isInDateRange = false;

          // filtering by field
          const changesField =
            !fields ||
            !!version.changes.find((item) => fields.includes(item.field));

          return isInDateRange && changesField;
        })
        .map((version) => {
          // filter by field for each verison
          if (fields) {
            version.changes = version.changes.filter((change) =>
              fields.includes(change.field)
            );
          }
          return version;
        });
      const type: 'csv' | 'xlsx' =
        req.query.type.toString() === 'csv' ? 'csv' : 'xlsx';

      const options = {
        translate: req.t,
        dateLocale,
        type,
      };
      return await historyFileBuilder(res, history, meta, options);
    } else {
      return res.status(404).send(req.t('common.errors.dataNotFound'));
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export the records of a resource, or the template to upload new ones.
 */
router.get('/resource/records/:id', async (req, res) => {
  try {
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
        return await templateBuilder(res, resource.name, columns);
      } else {
        const rows = await getRows(columns, records);
        const type = (req.query ? req.query.type : 'xlsx').toString();
        const filename = formatFilename(resource.name);
        return await fileBuilder(res, filename, columns, rows, type);
      }
    } else {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
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
  try {
    const params = req.body;

    // Send res accordingly to parameters
    if (!params.fields || !params.query) {
      return res
        .status(400)
        .send(i18next.t('routes.download.errors.missingParameters'));
    }

    // Initialization
    // let columns: any[] = [];
    // let rows: any[] = [];

    // Make distinction if we send the file by email or in the response
    if (!params.email) {
      switch (params.format) {
        case 'xlsx': {
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          res.setHeader(
            'Content-Disposition',
            'attachment; filename=records.xlsx'
          );
        }
        case 'csv': {
          res.header('Content-Type', 'text/csv');
          res.setHeader(
            'Content-Disposition',
            'attachment; filename=records.csv'
          );
        }
      }
      const buffer = await exportBatch(req, params);
      return res.send(buffer);
    } else {
      // Send response so the client is not frozen
      res.status(200).send('Export ongoing');
      // Build the file
      const file = await exportBatch(req, params);
      // Pass it in attachment
      const attachments = [
        {
          filename: `${params.fileName}.${params.format}`,
          content: file,
        },
      ];
      await sendEmail({
        message: {
          to: req.context.user.username,
          subject: `${params.application} - Your data export is completed - ${params.fileName}`, // TODO : put in config for 1.3
          html: 'Dear colleague,\n\nPlease find attached to this e-mail the requested data export.\n\nFor any issues with the data export, please contact ems2@who.int\n\n Best regards,\nems2@who.int', // TODO : put in config for 1.3
          attachments,
        },
      });
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export the template to add new users to an application by uploading a file
 */
router.get('/application/:id/invite', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    const roles = await Role.find({ application: application._id });
    const attributes = await PositionAttributeCategory.find({
      application: application._id,
    }).select('title');
    const fields = await getUserTemplateFields(roles);

    attributes.forEach((x) => fields.push({ name: x.title }));

    return await templateBuilder(res, `${application.name}-users`, fields);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export the template to add new users to the platform by uploading a file
 */
router.get('/invite', async (req, res) => {
  try {
    const roles = await Role.find({ application: null });
    const fields = await getUserTemplateFields(roles);
    return await templateBuilder(res, 'users', fields);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export selected users of the platform,
 * if a list with ids is not provided in the body, export all of them
 */
router.post('/users', async (req, res) => {
  try {
    const ability: AppAbility = req.context.user.ability;
    if (ability.can('read', 'User')) {
      const ids =
        req.body.users?.map((id) => new mongoose.Types.ObjectId(id)) || [];

      const filters = {};

      // If ids are provided, filter the users
      if (ids && ids.length > 0)
        Object.assign(filters, {
          _id: { $in: ids },
        });

      const users: any[] = await User.find(filters).populate({
        path: 'roles',
        match: { application: { $eq: null } },
      });
      return await buildUserExport(req, res, users);
    }
    return res.status(404).send(i18next.t('common.errors.dataNotFound'));
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export the users of a specific application,
 * if a list with ids is not provided in the body, export all of them
 */
router.post('/application/:id/users', async (req, res) => {
  try {
    const ability: AppAbility = req.context.user.ability;
    if (ability.can('read', 'User')) {
      const ids =
        req.body.users?.map((id) => new mongoose.Types.ObjectId(id)) || [];

      const aggregations: any[] = [
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

      if (ids.length > 0)
        // Filter users that are in the list of ids.
        aggregations.push({ $match: { _id: { $in: ids } } });

      const users = await User.aggregate(aggregations);
      return await buildUserExport(req, res, users);
    }
    return res.status(404).send(i18next.t('common.errors.dataNotFound'));
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Export another type of file
 */
router.get('/file/:form/:blob', async (req, res) => {
  try {
    const ability: AppAbility = req.context.user.ability;
    const form: Form = await Form.findById(req.params.form);
    if (!form) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    if (ability.cannot('read', form)) {
      return res
        .status(403)
        .send(i18next.t('common.errors.permissionNotGranted'));
    }
    try {
      const blobName = `${req.params.form}/${req.params.blob}`;
      const path = `files/${sanitize(req.params.blob)}`;
      await downloadFile('forms', blobName, path);
      res.download(path, () => {
        fs.unlink(path, () => {
          logger.info('file deleted');
        });
      });
    } catch {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
