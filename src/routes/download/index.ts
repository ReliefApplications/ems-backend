import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource, Application, Role, PositionAttributeCategory, User } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import fs from 'fs';
import { fileBuilder, downloadFile, templateBuilder, getColumns, getRows } from '../../utils/files';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';
import getFilter from '../../utils/schema/resolvers/Query/getFilter';

/* CSV or xlsx export of records attached to a form.
*/
const router = express.Router();

/**
 * Downloads the records of a form, or the template to upload new ones.
 */
router.get('/form/records/:id', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const filters = Form.accessibleBy(ability, 'read').where({ _id: req.params.id }).getFilter();
  const form = await Form.findOne(filters);
  if (form) {
    let records = [];
    let permissionFilters = [];
    let filter = {};
    if (ability.cannot('read', 'Record') && form.permissions.canSeeRecords.length > 0) {
      permissionFilters = getFormPermissionFilter(req.context.user, form, 'canSeeRecords');
      if (permissionFilters.length) {
        filter = { $and: [{ form: req.params.id }, { $or: permissionFilters }], archived: { $ne: true } };
      }
    } else {
      filter = { form: req.params.id, archived: { $ne: true } };
    }
    records = await Record.find(filter);
    const columns = getColumns(form.fields, req.query.template ? true : false);
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
 * CSV or xlsx export of versions of a record.
 */
router.get('/form/records/:id/history', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const recordFilters = Record.accessibleBy(ability, 'read').where({ _id: req.params.id, archived: { $ne: true } }).getFilter();
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
  const formFilters = Form.accessibleBy(ability, 'read').where({ _id: record.form }).getFilter();
  const form = await Form.findOne(formFilters);
  if (form) {
    const columns = getColumns(form.fields);
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
 * Downloads the records of a resource, or the template to upload new ones.
 */
router.get('/resource/records/:id', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const filters = Resource.accessibleBy(ability, 'read').where({ _id: req.params.id }).getFilter();
  const resource = await Resource.findOne(filters);
  if (resource) {
    let records = [];
    if (ability.can('read', 'Record')) {
      records = await Record.find({ resource: req.params.id, archived: { $ne: true } });
    }
    const columns = getColumns(resource.fields, req.query.template ? true : false);
    if (req.query.template) {
      return templateBuilder(res, resource.name, columns);
    } else {
      // const apiSources = await dataSources();
      const rows = await getRows(columns, records);
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, resource.name, columns, rows, type);
    }
  } else {
    res.status(404).send(errors.dataNotFound);
  }
});

/**
 * CSV or xlsx export of list of records
 * The parameters are :
 * params = {
 *    exportOptions = {                   // The different options the user can select
 *      records: 'all' | 'selected',      // Export all the records of the resource or only the selected ones
 *    },
 *    ids?: string[],                     // If exportOptions.records === 'selected', list of ids of the records
 *    resId: number, 
 *    fields?: any[],                     // If exportOptions.fields === 'displayed', list of the names of the fields we want to export
 *    filter?: any                        // If any set, list of the filters we want to apply
 *    format: 'csv' | 'xlsx'           // Export on csv or excel format
 * }
 */
router.post('/records', async (req, res) => {

  const ability: AppAbility = req.context.user.ability;
  const params = req.body;

  const record: any = await Record.findOne(Record.accessibleBy(ability, 'read').where({ _id: params.ids[0] }).getFilter()); // Get the first record
  const id = record.resource || record.form; // Get the record's parent resource / form id
  const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions fields');
  const resource = await Resource.findById(id).select('permissions fields');
  // Check if the form exist
  if (!form ) return res.status(404).send(errors.dataNotFound);

  const defaultFields = [
    { name: 'id', field: 'id', type: 'text' },
    { name: 'incrementalId', field: 'incrementalId', type: 'text' },
    { name: 'createdAt', field: 'createdAt', type: 'date' },
  ];
  const structureFields = defaultFields.concat(resource ? resource.fields : form.fields);
  
  // Filter from the query definition
  const mongooseFilter = getFilter(params.filter, structureFields);
  Object.assign(mongooseFilter,
    { $or: [{ resource: id }, { form: id }] },
    { archived: { $ne: true } },
  );

  let filters: any = {};
  if (ability.cannot('read', 'Record')) {
    // form.permissions.canSeeRecords.length > 0
    const permissionFilters = getFormPermissionFilter(req.context.user, form, 'canSeeRecords');
    if (permissionFilters.length) {
      filters = { $and: [mongooseFilter, { $or: permissionFilters }] }; // No way not to bypass the "filters" variable and directly add the permissions to existing permissionFilters
    } else {
      res.status(404).send(errors.dataNotFound);
    }
  } else {
    filters = mongooseFilter;
  }

  // Builds the columns
  let columns: any;
  if (params.fields) {
    // Only returns selected columns.
    const displayedFields = structureFields.filter(x => params.fields.includes(x.name)).sort((a, b) => {
      return params.fields.indexOf(a.name) - params.fields.indexOf(b.name);
    });
    columns = getColumns(displayedFields);
  } else {
    // Returns all columns
    columns = getColumns(structureFields);
  }

  // Builds the rows
  const records = await Record.find(filters);
  // const apiSources = await dataSources();
  const rows = await getRows(columns, records);

  // Returns the file
  return fileBuilder(res, form.name, columns, rows, params.format);
});

router.get('/application/:id/invite', async (req, res) => {
  const application = await Application.findById(req.params.id);
  const roles = await Role.find({ application: application._id });
  const attributes = await PositionAttributeCategory.find({ application: application._id }).select('title');
  const fields = [
    {
      name: 'email',
    },
    {
      name: 'role',
      meta: {
        type: 'list',
        allowBlank: true,
        options: roles.map(x => x.title),
      },
    },
  ];
  attributes.forEach(x => fields.push({ name: x.title }));
  return templateBuilder(res, `${application.name}-users`, fields);
});

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
        options: roles.map(x => x.title),
      },
    },
  ];
  return templateBuilder(res, 'users', fields);
});

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
        roles: x.roles.map(role => role.title).join(', '),
      };
    });
    if (rows) {
      const columns = [{ name: 'username' }, { name: 'name' }, { name: 'roles' }];
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, 'users', columns, rows, type);
    }
  }
  res.status(404).send(errors.dataNotFound);
});

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
              cond: { $eq: ['$$role.application', mongoose.Types.ObjectId(req.params.id)] },
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
        roles: x.roles.map(role => role.title).join(', '),
      };
    });

    if (rows) {
      const columns = [{ name: 'username' }, { name: 'name' }, { name: 'roles' }];
      const type = (req.query ? req.query.type : 'xlsx').toString();
      return fileBuilder(res, 'users', columns, rows, type);
    }
  }
  res.status(404).send(errors.dataNotFound);
});

/* Export of file
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
