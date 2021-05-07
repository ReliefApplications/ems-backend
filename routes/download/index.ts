import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import downloadFile from '../../utils/downloadFile';
import getPermissionFilters from '../../utils/getPermissionFilters';
import fs from 'fs';
import excelBuilder from "../../utils/excelBuilder";

/* CSV or xlsx export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id/:extension', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    if (form) {
        let records = [];
        let permissionFilters = [];
        if (ability.cannot('read', 'Record')) {
            permissionFilters = getPermissionFilters(req.context.user, form, 'canSeeRecords');
            if (permissionFilters.length) {
                records = await Record.find({ $and: [{ form: req.params.id }, { $or: permissionFilters }] });
            }
        } else {
            records = await Record.find({ form: req.params.id });
        }

        const fields = form.fields.map(x => x.name);
        const data = records.map(x => x.data);

        return excelBuilder(res, form.name, fields, data, req.params.extension);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of records attached to a resource.
*/
router.get('/resource/records/:id/:extension', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Resource.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const resource = await Resource.findOne(filters);
    if (resource) {
        let records = [];
        if (ability.can('read', 'Record')) {
            records = await Record.find({ resource: req.params.id });
        }
        const fields = resource.fields.map(x => x.name);
        const data = records.map(x => x.data);
        return excelBuilder(res, resource.name, fields, data, req.params.extension);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of list of records.
*/
router.get('/records/:extension', async (req, res) => {
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
            const fields = form.fields.map(x => x.name);
            if (ability.cannot('read', 'Record')) {
                permissionFilters = getPermissionFilters(req.context.user, form, 'canSeeRecords');
                if (permissionFilters.length) {
                    const records = await Record.find({ $and: [
                        { _id: { $in: ids } },
                        { form: form.id },
                        { $or: permissionFilters }
                    ]});
                    const data = records.map(x => x.data);
                    return excelBuilder(res, form.name, fields, data, req.params.extension);
                }
            } else {
                const records = await Record.find({ $and: [
                    { _id: { $in: ids } },
                    { form: form.id }
                ]});
                const data = records.map(x => x.data);
                return excelBuilder(res, form.name, fields, data, req.params.extension);
            }
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
    await downloadFile(req.params.form, req.params.blob);
    res.download(`files/${req.params.blob}`, () => {
        fs.unlink(`files/${req.params.blob}`, () => {
            console.log('file deleted');
        });
    });
});

export default router;
