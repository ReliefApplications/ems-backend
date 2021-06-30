import request from 'request'
import { Record } from '../models';

export default async (form: any, res: any, idForm: any, accessToken: any, formIdKoBo: any) => {

    const options = {
        'method': 'GET',
        'url': `https://kobo.humanitarianresponse.info/assets/${formIdKoBo}/submissions/?format=json`,
        'json': true,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Token ${accessToken}`
        }
    };

    const recordsToImport = [];

    await request(options, await function(error, response): any {
        if (error) throw new Error(error);

        const records = response.body;

        let fieldInRecord = false;

        // Init recordsToImport
        for (const i in records){
            recordsToImport[i] = {};
        }

        console.log(form.fields);
        console.log('*****');
        console.log(records);

        // Question Form Model
        for (const q of form.fields){
            // Each record
            for (const r in records){
                // Each element of record
                let val;
                for (const [key, value] of Object.entries(records[r])){
                    val = value;
                    if( q.name == key || q.name ==  key.toString().split('/')[0]){
                        fieldInRecord = true;
                        // if the element is normal
                        if(q.name == key){
                            if(q.type == 'tagbox' || q.type == 'checkbox'){
                                val = value.toString().split(' ');
                            }
                            if(q.type == 'time'){
                                val = value.toString().split(':')[0]+':'+value.toString().split(':')[1];
                                console.log('$$$ t $$$');
                                console.log(val);
                                // from transformRecord
                                if (val != null && !(val instanceof Date)) {
                                    const hours = val.slice(0, 2);
                                    const minutes = val.slice(3);
                                    val = new Date(Date.UTC(1970, 0, 1, hours, minutes));
                                }
                                console.log(val);
                            }
                        }
                        // if the element is a group (the name pattern is something/something)
                        else if(q.name == key.toString().split('/')[0]){
                            if( q.type == 'matrix' || q.type == 'multipletext'){
                                let n = key.toString().split('/')[1];
                                if(q.type == 'multipletext'){
                                    if(RegExp('.+\\_.+').test(n)){
                                        n = n.split('_')[0];
                                    }
                                }
                                if(recordsToImport[r][q.name] == null){
                                    recordsToImport[r][q.name] = {};
                                }
                                recordsToImport[r][q.name][n] = value;
                            }
                            if( q.type == 'matrixdropdown'){
                                const n = key.toString().split('/')[1];
                                const n2 = n.substr(n.indexOf('_')+1);

                                if(recordsToImport[r][q.name] == null){
                                    recordsToImport[r][q.name] = {};
                                }

                                if(recordsToImport[r][q.name][n2] == null){
                                    recordsToImport[r][q.name][n2] = {};
                                }
                                const n3 = key.toString().split('/')[2];
                                const n4 = n3.split(n+'_')[1];
                                recordsToImport[r][q.name][n2][n4] = value;
                            }
                        }
                        if( q.type != 'matrix' && q.type != 'matrixdropdown' && q.type != 'multipletext' )
                            recordsToImport[r][q.name] = val;
                    }
                }
                if(fieldInRecord == false){
                    recordsToImport[r][q.name] = null;
                }
                else {
                    // re-init
                    fieldInRecord = false;
                }
            }
        }
        console.log(recordsToImport);
        const recordsToImportFormatted = [];
        for (const r of recordsToImport) {
            const record = new Record({
                form: idForm,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data: r,
                resource: form.resource ? form.resource : null,
            });
            recordsToImportFormatted.push(record);
        }
        Record.insertMany(recordsToImportFormatted);
        res.send(recordsToImport);
    });
}
