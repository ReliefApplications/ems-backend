import express from 'express';
import { Workbook } from 'exceljs';
import { Form, Record } from "../../models";

const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const router = express.Router();
/**
 * Upload file with data
 * */
router.post('/form/records/:id', async (req: any, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const form = await Form.findById(req.params.id);

    // Check if the form exist
    if (!form) {
        return res.status(400).send('Form not found');
    }

    // Get the file from request
    const file = req.files.excelFile;

    // Check file size
    if (file.size > FILE_SIZE_LIMIT) {
        return res.status(400).send('File size exceed 5MB');
    }

    // Check file extension (only allowed .xlsx)
    if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx') {
        return res.status(400).send('Invalid extension');
    }

    const records: Record[] = [];

    const workbook = new Workbook();
    workbook.xlsx.load(file.data).then((wb) => {
        let keys = [];
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow({includeEmpty: false}, function (row, rowNumber) {
            const values = Object.values(row.values);
            if (rowNumber === 1) {
                keys = values;
            } else {
                const data = {};
                keys.forEach((key, index) => {
                    data[`${key}`] = values[index];
                });
                records.push(new Record({
                    form: form.id,
                    createdAt: new Date(),
                    modifiedAt: new Date(),
                    data: data,
                    resource: form.resource ? form.resource : null
                }));
            }
        });
        if (records.length > 0) {
            Record.insertMany(records, {}, async () => {
                return res.status(200).send({status: 'OK'});
            });
        } else {
            return res.status(200).send({status: ''});
        }
    });
});

export default router;
