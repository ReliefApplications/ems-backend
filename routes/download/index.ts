import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import csvBuilder from '../../utils/csvBuilder';
import getPermissionFilters from '../../utils/getPermissionFilters';

/* CSV export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const words = req.params.id.split(',');
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: words[0]}).getFilter();
    const form = await Form.findOne(filters);
    if (form && words.length === 1) {
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
        console.log(fields)
        const data = records.map(x => x.data);

        return csvBuilder(res, form.name, fields, data);
    } else if (words.length >= 1 && ability.can('read', 'Record')) {
        let records = [];
        for (let id of words) {
            records.push(await Record.findById(id));
        }
        const filters = Form.accessibleBy(ability, 'read').where({_id: records[0].form}).getFilter();
        const form = await Form.findOne(filters);
        if (form) {
            const fields = form.fields.map(x => x.name);
            const data = records.map(x => x.data);
    
            return csvBuilder(res, form.name, fields, data);
        } else {
            res.status(404).send(errors.dataNotFound);
        }
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

export default router;