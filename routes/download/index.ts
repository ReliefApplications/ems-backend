import express from 'express';
import { Form, Record } from '../../models';
import csvBuilder from '../../utils/csvBuilder';

const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const form = await Form.findById(req.params.id);
    const records = await Record.find({ form: req.params.id });

    const fields = form.fields.map(x => x.name);
    const data = records.map(x => x.data);

    return csvBuilder(res, form.name, fields, data);
});

export default router;