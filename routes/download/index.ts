import express from 'express';
import errors from '../../const/errors';
import { Form, Record } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import csvBuilder from '../../utils/csvBuilder';
import getPermissionFilters from '../../utils/getPermissionFilters';

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

export default router;