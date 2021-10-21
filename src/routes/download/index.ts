import express from 'express';
import errors from '../../const/errors';
import {Form, Record, Resource, Application, Role, PositionAttributeCategory, User} from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { getFormPermissionFilter } from '../../utils/filter';
import fs from 'fs';
import { fileBuilder, downloadFile, templateBuilder, getColumns, getRows } from '../../utils/files';
import sanitize from 'sanitize-filename';
import {UserType} from "../../schema/types";
import {AccessibleRecordModel} from "@casl/mongoose";

/* CSV or xlsx export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    console.log(form);
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
        console.log('---------------------- columns');
        console.log(columns);
        console.log('---------------------- form.fields');
        console.log(form.fields);
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
        let filters: any;
        let permissionFilters = [];
        const record: any = await Record.findById(ids[0]);
        if (record) {
            const type = (req.query ? req.query.type : 'xlsx').toString();
            const id = record.resource ? record.resource : record.form;
            const mongooseFilter = {
                _id: { $in: ids },
                $or: [{ resource: id }, { form: id }],
                archived: { $ne: true }
            };
            const form = await Form.findOne({ $or: [{ _id: id }, { resource: id, core: true }] }).select('permissions fields');
            const columns = getColumns(form.fields);
            if (ability.cannot('read', 'Record')) {
                permissionFilters = getFormPermissionFilter(req.context.user, form, 'canSeeRecords');
                if (permissionFilters.length) {
                    filters = { $and: [mongooseFilter, { $or: permissionFilters }] };
                } else {
                    res.status(404).send(errors.dataNotFound);
                }
            } else {
                filters = mongooseFilter;
            }
            const records = await Record.find(filters);
            const rows = getRows(columns, records);
            return fileBuilder(res, form.name, columns, rows, type);
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

router.get('/users', async (req, res) => {
    console.log('export users');
    // const ability: AppAbility = req.context.user.ability;
    const users = await User.find({});
    const roles = await Role.find({id : '6008387bc67fc800441130e3'});
    console.log('£££ roles');
    console.log(roles);
    // console.log(utemp);
    // utemp.forEach((v, i, a) => console.log(v));
    // const test = users.map(u => new Object({name: u.name, username: u.username, role: 'test'}));
    const test = await users.map(u => {
        let roles = '';
        let r = [];
        r = u.roles;
        console.log(r);
        console.log(r.length);
        r.forEach((v, i, a) => {
            if(roles !== '') {
                roles = roles + ', ';
            }
            const rolesTemp: any = Role.find({id : v});
            console.log(rolesTemp.type);
            console.log(rolesTemp);
            roles = rolesTemp.Role.title.toString();
        });
        console.log('%=> roles');
        console.log(roles);
        return {name: u.name, username: u.username, roles: roles};
    });
    // const test = users.map(u => new Object({name: u.name, username: u.username, role: Role.find({id: u.roles})}));



    // bug foreach not the good spelling
    // const roles = await users.map((u: any) => {
    //     let roles = '';
    //     u.roles.foreach((v, i, a) => {
    //         if(roles !== '') {
    //             roles = roles + ', ';
    //         }
    //         roles = Role.find({id : v}).toString();
    //     });
    //     console.log(roles);
    // });


    // users.map(u => {
    //     console.log('$-------$');
    //     console.log(u.name);
    //     console.log(u.roles);
    // });
    // console.log('================> roles');
    // console.log(roles);


    // const usersTwo =  users.map((u: any) => {...u, roles: await Role.find({id: u.role})})
    // const usersTwo = users.map((u: any) => {'roles': Role.find({id: u.roles}, ...u)});
    // const usersTwo = users.map((u: any) => console.log(u));
    // const usersTwo = users.map(u => new Object({...u, role: 'test'}));
    // users = users.map((u) => {u});
    // const usersTwo = users.toString();
    // const usersTwo = users.map(u => {name: u.name, username: u.username, roles: 'test'});

    // console.log('users');
    // console.log(users);
    //
    // console.log('usersTwo');
    // console.log(usersTwo);

    console.log('test');
    console.log(test);
    // console.log('roles');
    // console.log(roles);
    if (test) {
        const columns = [{name: 'role'}, {name: 'username'}, {name: 'name'}];
        console.log(columns);
        const rows = test;
        const type = (req.query ? req.query.type : 'xlsx').toString();
        return fileBuilder(res, 'users', columns, rows, type);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
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
