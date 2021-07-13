import express from 'express';
import { Workbook } from 'exceljs';
import { Form, Record } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';
import convertFilter from '../../utils/convertFilter';

const FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const router = express.Router();
/**
 * Upload file with data
 * */
router.post('/form/records/:id', async (req: any, res) => {
    // Check file
    if (!req.files || Object.keys(req.files).length === 0) return res.status(400).send(errors.missingFile);
    // Get the file from request
    const file = req.files.excelFile;
    // Check file size
    if (file.size > FILE_SIZE_LIMIT) return res.status(400).send(errors.fileSizeLimitReached);
    // Check file extension (only allowed .xlsx)
    if (file.name.match(/\.[0-9a-z]+$/i)[0] !== '.xlsx') return res.status(400).send(errors.fileExtensionNotAllowed);

    const ability: AppAbility = req.context.user.ability;
    const form = await Form.findById(req.params.id);

    // Check if the form exist
    if (!form) return res.status(404).send(errors.dataNotFound);
    let canCreate = false;
    if (ability.can('create', 'Record')) {
        canCreate = true;
    } else {
        const roles = req.context.user.roles.map(x => mongoose.Types.ObjectId(x._id));
        canCreate = form.permissions.canCreateRecords.length > 0 ? form.permissions.canCreateRecords.some(x => roles.includes(x)) : true;
    }
    // Check unicity of record
    if (form.permissions.recordsUnicity) {
        const unicityFilter = convertFilter(form.permissions.recordsUnicity, Record, req.context.user);
        if (unicityFilter) {
            const uniqueRecordAlreadyExists = await Record.exists({ $and: [{ form: form._id }, unicityFilter] });
            canCreate = !uniqueRecordAlreadyExists;
        }
    }
    if (canCreate) {
        const records: Record[] = [];
        const workbook = new Workbook();
        workbook.xlsx.load(file.data).then(() => {
            let keys = [];
            const worksheet = workbook.getWorksheet(1);
            worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
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
                    return res.status(200).send({ status: 'OK' });
                });
            } else {
                return res.status(200).send({ status: '' });
            }
        });
    } else {
        return res.status(403).send(errors.dataNotFound);
    }
});

export default router;
