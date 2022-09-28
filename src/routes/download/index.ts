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
} from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import extendAbilityForRecords from '../../security/extendAbilityForRecords';
import fs from 'fs';
import {
  fileBuilder,
  downloadFile,
  templateBuilder,
  getColumns,
  getRows,
  extractGridData,
  HistoryFileBuilder,
} from '../../utils/files';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';
import i18next from 'i18next';
import { RecordHistory } from '../../utils/history';
import { logger } from '../services/logger.service';
import { getAccessibleFields } from '../../utils/form';

/**
 * Exports files in csv or xlsx format, excepted if specified otherwised
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
      return templateBuilder(res, form.name, columns);
    } else {
      const rows = await getRows(
        columns,
        getAccessibleFields(records, formAbility)
      );
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, form.name, columns, rows, type);
    }
  } else {
    res.status(404).send(i18next.t('errors.dataNotFound'));
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
      field?: string;
    } = {};
    if (req.query) {
      const { from, to, field } = req.query as any;
      filters = Object.assign(
        {},
        from === 'NaN' ? null : { fromDate: new Date(parseInt(from, 10)) },
        to === 'NaN' ? null : { toDate: new Date(parseInt(to, 10)) },
        !field ? null : { field }
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
        field: filters.field || req.t('history.allFields'),
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
            !filters.field ||
            !!version.changes.find((item) => item.field === filters.field);

          return isInDateRange && changesField;
        })
        .map((version) => {
          // filter by field for each verison
          if (filters.field) {
            version.changes = version.changes.filter(
              (change) => change.field === filters.field
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
      return await HistoryFileBuilder(res, history, meta, options);
    } else {
      res.status(404).send(req.t('errors.dataNotFound'));
    }
  } catch (err) {
    logger.error(err);
    res.status(500).send(req.t('errors.internalServerError'));
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
    res.status(404).send(i18next.t('errors.dataNotFound'));
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
 *    format: 'csv' | 'xlsx'           // Export on csv or excel format
 *    query: any                          // Query parameters to build it
 *    sortField?: string
 *    sortOrder?: 'asc' | 'desc'
 * }
 */
router.post('/records', async (req, res) => {
  const params = req.body;

  if (!params.fields || !params.query) {
    return res.status(400).send(i18next.t('errors.missingParameters'));
  }

  const { columns, rows } = await extractGridData(
    params,
    req.headers.authorization
  );

  // Returns the file
  return fileBuilder(res, 'records', columns, rows, params.format);
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
  const fields = await getUserTemplateFields(roles);

  attributes.forEach((x) => fields.push({ name: x.title }));

  return templateBuilder(res, `${application.name}-users`, fields);
});

/**
 * Export the template to add new users to the platform by uploading a file
 */
router.get('/invite', async (req, res) => {
  const roles = await Role.find({ application: null });
  const fields = await getUserTemplateFields(roles);

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
    return buildUserExport(req, res, users);
  }
  res.status(404).send(i18next.t('errors.dataNotFound'));
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
    return buildUserExport(req, res, users);
  }
  res.status(404).send(i18next.t('errors.dataNotFound'));
});

/**
 * Export another type of file
 */
router.get('/file/:form/:blob', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const form: Form = await Form.findById(req.params.form);
  if (!form) {
    res.status(404).send(i18next.t('errors.dataNotFound'));
  }
  if (ability.cannot('read', form)) {
    res.status(403).send(i18next.t('errors.permissionNotGranted'));
  }
  const blobName = `${req.params.form}/${req.params.blob}`;
  const path = `files/${sanitize(req.params.blob)}`;
  await downloadFile('forms', blobName, path);
  res.download(path, () => {
    fs.unlink(path, () => {
      logger.info('file deleted');
    });
  });
});

export default router;
