import express from 'express';
import { Form, Record } from '../../models';


const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const form = await Form.findById(req.params.id);
    const records = await Record.find({ form: req.params.id });

    const headers = ['id', 'created at'].concat(form.fields.map(x => x.name));
    console.log(headers);
    const data = [
        ['ID', 'Name', 'Age', 'Gender']
        , [1, 'Taro Yamada', 25, 'Male']
        , [2, 'Hanako Yamada', 24, 'Female']
        , [3, 'John Doe', 30, 'Male']
        , [4, 'Jane Doe', 30, 'Female']
    ];

    // CSV Specification
    // http://www.ietf.org/rfc/rfc4180.txt

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv');

    data.forEach((item) => {
        res.write(item.map((field) => {
            return '"' + field.toString().replace(/\"/g, '""') + '"';
        }).toString() + '\r\n');
    });

    res.end();
});

export default router;