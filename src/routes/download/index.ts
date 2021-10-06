import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource, Application, Role, PositionAttributeCategory } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import fs from 'fs';
import { fileBuilder, downloadFile, templateBuilder, getColumns, getRows } from '../../utils/files';
import sanitize from 'sanitize-filename';

/* CSV or xlsx export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    if (form) {
        let records = [];
        let permissionFilters = [];
        let filter = {};
        if (ability.cannot('read', 'Record')) {
            permissionFilters = getFormPermissionFilter(req.context.user, form, 'canSeeRecords');
            if (permissionFilters.length) {
                filter = { $and: [{ form: req.params.id }, { $or: permissionFilters }], archived: { $ne: true } };
            }
        } else {
            filter = { form: req.params.id, archived: { $ne: true } };
        }
        records = await Record.find(filter);
        const columns = getColumns(form.fields);
        if (req.query.template) {
            return templateBuilder(res, form.name, columns);
        } else {
            const rows = getRows(columns, records);
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
    const recordFilters = Record.accessibleBy(ability, 'read').where({_id: req.params.id, archived: { $ne: true } }).getFilter();
    const record = await Record.findOne(recordFilters)
        .populate({
            path: 'versions',
            populate: {
                path: 'createdBy',
                model: 'User'
            }
        })
        .populate({
            path: 'createdBy.user',
            model: 'User'
        });
    const formFilters = Form.accessibleBy(ability, 'read').where({_id: record.form}).getFilter();
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
        })
        const currentVersion = record.data;
        currentVersion['Modification date'] = record.modifiedAt;
        currentVersion['Created by'] = record.createdBy?.user?.username || null;
        data.push(record.data);
        columns.push({ name: 'Modification date' });
        columns.push({ name: 'Created by' });
        return fileBuilder(res, record.id, columns, data, type);
    }
    else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of records attached to a resource.
*/
router.get('/resource/records/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Resource.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const resource = await Resource.findOne(filters);
    if (resource) {
        let records = [];
        if (ability.can('read', 'Record')) {
            records = await Record.find({ resource: req.params.id, archived: { $ne: true } });
        }
        const columns = getColumns(resource.fields);
        const rows = getRows(columns, records);
        const type = (req.query ? req.query.type : 'xlsx').toString();
        return fileBuilder(res, resource.name, columns, rows, type);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of list of records.
*/
router.get('/records', async (req, res) => {
    const ids = req.query?.ids.toString().split(',') || [];
    const ability: AppAbility = req.context.user.ability;
    if (ids.length > 0) {
        let permissionFilters = [];
        const record: any = await Record.findById(ids[0]).populate({
            path: 'form',
            model: 'Form'
        });
        const form = record.form;
        if (form) {
            const type = (req.query ? req.query.type : 'xlsx').toString();
            const columns = getColumns(form.fields);
            if (ability.cannot('read', 'Record')) {
                permissionFilters = getFormPermissionFilter(req.context.user, form, 'canSeeRecords');
                if (permissionFilters.length) {
                    const records = await Record.find({ $and: [
                        { _id: { $in: ids } },
                        { form: form.id },
                        { $or: permissionFilters },
                        { archived: { $ne: true } }
                    ]});
                    const rows = getRows(columns, records);
                    return fileBuilder(res, form.name, columns, rows, type);
                }
            } else {
                const records = await Record.find({ $and: [
                    { _id: { $in: ids } },
                    { form: form.id },
                    { archived: { $ne: true } }
                ]});
                const rows = getRows(columns, records);
                return fileBuilder(res, form.name, columns, rows, type);
            }
        }
    }
    res.status(404).send(errors.dataNotFound);
});

router.get('/application/:id/invite', async (req, res) => {
    const application = await Application.findById(req.params.id);
    const roles = await Role.find({ application: application._id });
    const attributes = await PositionAttributeCategory.find({ application: application._id }).select('title');
    const fields = [
        {
            name: 'email'
        },
        {
            name: 'role',
            meta: {
                type: 'list',
                allowBlank: true,
                options: roles.map(x => x.title)
            }
        }
    ];
    attributes.forEach(x => fields.push({ name: x.title }));
    return await templateBuilder(res, `${application.name}-users`, fields);
});

router.get('/invite', async (req, res) => {
    const roles = await Role.find({ application: null });
    const fields = [
        {
            name: 'email'
        },
        {
            name: 'role',
            meta: {
                type: 'list',
                allowBlank: true,
                options: roles.map(x => x.title)
            }
        }
    ];
    return await templateBuilder(res, 'users', fields);
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
    const path = `files/${sanitize(req.params.form)}/${sanitize(req.params.blob)}`;
    await downloadFile('forms', blobName);
    console.log('ok for path ', path);
    res.download(path, () => {
        fs.unlink(path, () => {
            console.log('file deleted');
        });
    });
});

export default router;
