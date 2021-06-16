import express from "express";
import recordReader from "../../utils/files/recordReader";

import request from "request";
import {AppAbility} from "../../security/defineAbilityFor";
import {Form} from "../../models";
import updateRecords from "../../utils/updateRecords";

const router = express.Router();

router.post('/records/add', async (req: any, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    console.log(req.files.sampleFile.name);
    console.log(req.files.sampleFile);
    const file = req.files.sampleFile;
    // file.mv('/Users/martin/Desktop/Stage_ReliefApp/Projets/emrs-safe-backend/records/'+file.name);

    //const file: Blob = new Blob(req.files.sampleFile.data);
    return recordReader(file.data);
    // res.send('File uploaded!');
});

router.get('/records/update/:id', async (req: any, res) => {
    console.log('/records/update/:id');

    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    // TODO: auth error

    const data = await updateRecords(form, res, req.params.id);

    console.log('DISPLAY');
    console.log(data);
    // for loop
    // await transformRecord(args.data, form.fields);
    // const record = new Record({
    //     form: args.form,
    //     createdAt: new Date(),
    //     modifiedAt: new Date(),
    //     data: args.data,
    //     resource: form.resource ? form.resource : null,
    //     createdBy: {
    //         user: user.id,
    //         roles: user.roles.map(x => x._id),
    //         positionAttributes: user.positionAttributes.map(x => {
    //             return {
    //                 value: x.value,
    //                 category: x.category._id
    //             }
    //         })
    //     }
    // });
    // await record.save();
});

export default router;
