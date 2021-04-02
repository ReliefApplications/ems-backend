import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import csvBuilder from '../../utils/csvBuilder';
import downloadFile from '../../utils/downloadFile';
import getPermissionFilters from '../../utils/getPermissionFilters';
import fs from 'fs';

/* CSV export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
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

        return csvBuilder(res, form.name, fields, data);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

router.get('/resource/records/:id', async (req, res) => {
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

        return csvBuilder(res, resource.name, fields, data);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

router.get('/record/:id/file/:file', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const record: Record = await Record.findById(req.params.id).populate('form');
    if (!record) {
        res.status(404).send(errors.dataNotFound);
    }
    if (ability.cannot('read', 'Record')) {
        let permissionFilters = [];
        permissionFilters = getPermissionFilters(req.context.user, record.form, 'canSeeRecords');
        if (permissionFilters.length) {
            if (!await Record.find({ $and: [ { _id: req.params.id }, { $or: permissionFilters }]})) {
                res.status(403).send(errors.permissionNotGranted);
            }
        } else {
            res.status(403).send(errors.permissionNotGranted);
        }
    }
    console.log(record);
    const containerName = 'ccc116c1-9fa4-49df-bc2c-aedb55f420ef';
    const blobName = 'f1d71e10-24a8-4ecc-8083-e875830ffc3d';
    await downloadFile(containerName, blobName);
    res.download(`files/${blobName}`, (err) => {
        fs.unlink(`files/${blobName}`, () => {
            console.log('file deleted');
        });
    });
});

export default router;