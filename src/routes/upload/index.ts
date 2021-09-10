import express from 'express';
import { Workbook } from 'exceljs';
import { Application, Form, PositionAttribute, PositionAttributeCategory, Record, Role, User } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';
import { getRecordAccessFilter } from '../../utils/filter';

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
        const unicityFilter = getRecordAccessFilter(form.permissions.recordsUnicity, Record, req.context.user);
        if (unicityFilter) {
            const uniqueRecordAlreadyExists = await Record.exists({ $and: [{ form: form._id }, unicityFilter] });
            canCreate = !uniqueRecordAlreadyExists;
        }
    }
    if (canCreate) {
        const records: Record[] = [];
        const workbook = new Workbook();
        workbook.xlsx.load(file.data).then( async ()  => {
            let keys = [];
            const worksheet = workbook.getWorksheet(1);
            const promises = [];
            worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
                const promise = new Promise<void>(async (resolve,reject) => {
                    const positionAttributes = [];
                    const values = Object.values(row.values);
                    if (rowNumber === 1) {
                        keys = values;
                    } else {
                        const data = {};
                        const dataToFind = {};
                        keys.forEach((key, index) => {
                            if (key[0] !== "$") {
                                data[`${key}`] = values[index];
                            } else {
                                dataToFind[`${key}`] = values[index];
                            }
                        });
                        // build the created by data
                        const application = await Application.findById(dataToFind['$applicationID']);
                        const user = await User.find({ 'username': dataToFind['$username']});
                        const role = await Role.find({ application: application._id }).where({ 'title': dataToFind['$role']});
                        const dataKeys = Object.getOwnPropertyNames(dataToFind)
                        for (const element of dataKeys) {
                            if(!['$applicationID', '$username', '$role'].includes(element)) {
                                const title = element.charAt(1).toUpperCase() + element.substring(2)
                                const category = await PositionAttributeCategory.find({ application: application }).where({ 'title': title });
                                const positionAttribute = {
                                    value: dataToFind[element],
                                    category: category[0]._id.toString()
                                }
                                positionAttributes.push(positionAttribute);
                            }
                        }
                        records.push(new Record({
                            form: form.id,
                            createdAt: new Date(),
                            modifiedAt: new Date(),
                            data: data,
                            resource: form.resource ? form.resource : null,
                            createdBy: {
                                user: user[0]._id,
                                roles: [role[0]._id],
                                positionAttributes: positionAttributes
                            }
                        }));
                    }
                    resolve()
                });
                if (rowNumber !== 1) {
                    promises.push(promise);
                }
            });
            await Promise.all(promises);
            if (records.length > 0) {
                Record.insertMany(records, {}, () => {
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
