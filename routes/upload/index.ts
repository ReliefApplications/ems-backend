import express from "express";
import recordReader from "../../utils/files/recordReader";
import fs from "fs"
import updateRecords from "../../utils/updateRecords";

import request from "request";
import seeNotification from "../../schema/mutation/seeNotification";
import {AppAbility} from "../../security/defineAbilityFor";
import {Form} from "../../models";

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
    // const records = await updateRecords();
    // console.log(records);
    // res.send(records);

    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    // console.log('@ form @');
    // console.log(form);
    // console.log('# records #');
    // console.log(records);

    const options = {
        'method': 'GET',
        'url': 'https://kobo.humanitarianresponse.info/assets/a2MN6zEzV6pXMbY3Jx7iCr/submissions/?format=json',
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'Token 55c9b101af16d7c70e3e0fb4caf817d16758afe3'
        }
    };
    await request(options, await function(error, response): any {
        if (error) throw new Error(error);

        let recordTemp;

        let records = response.body.toString();
        records = JSON.parse(records);
        // console.log(records);

        // Question Form Model
        for (const q of form.fields){
            // console.log(q.name);
            // Each Record
            for (const i in records){
                //console.log(records[i]);
                // Record

                for (const r of Object.keys(records[i])){
                    // console.log(r);
                    // TODO : find how to get the value of r (the key)
                    // console.log(Object.values(records[i].r));
                    if(q.name == r){
                        console.log(r);
                        console.log('Match!' + q + '==' + r);
                        // recordTemp[r] = r.
                    }else {
                        // console.log('XXX' + q + '==' + k);
                    }
                }
            }
        }
    });



});

export default router;
