import express from "express";
import recordReader from "../../utils/files/recordReader";

import request from "request";
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
    console.log('/records/update/:id');

    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);

    const options = {
        'method': 'GET',
        'url': 'https://kobo.humanitarianresponse.info/assets/a2MN6zEzV6pXMbY3Jx7iCr/submissions/?format=json',
        'json': true,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Token 55c9b101af16d7c70e3e0fb4caf817d16758afe3'
        }
    };

    const recordsToImport = [];

    await request(options, await function(error, response): any {
        if (error) throw new Error(error);

        const records = response.body;

        // Init recordsToImport
        for (const i in records){
            recordsToImport[i] = {};
        }

        // Question Form Model
        for (const q of form.fields){
            // Each record
            for (const i in records){
                // Each element of record
                for (const [key, value] of Object.entries(records[i])){
                    if( q.name == key ){
                        // console.log('Match!' + q + '==' + key);
                        recordsToImport[i][key] = value;
                    }
                }
            }
        }
        console.log(recordsToImport);
    });
});

export default router;
