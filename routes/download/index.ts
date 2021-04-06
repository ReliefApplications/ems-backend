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
    res.download(`files/${req.params.blob}`, (err) => {
        fs.unlink(`files/${req.params.blob}`, () => {
            console.log('file deleted');
        });
    });
});

export default router;