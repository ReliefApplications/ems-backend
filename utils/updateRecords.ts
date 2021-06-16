import request from "request"

export default async (form: any, res: any) => {

    const options = {
        'method': 'GET',
        'url': 'https://kobo.humanitarianresponse.info/assets/aN5SzmYrAiPWJhi4CJoGSW/submissions/?format=json',
        'json': true,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': 'Token '+process.env.TOKEN_KOBO
        }
    };

    const recordsToImport = [];

    await request(options, await function(error, response): any {
        if (error) throw new Error(error);

        const records = response.body;
        // console.log(response.body);

        let fieldInRecord = false;

        // Init recordsToImport
        for (const i in records){
            recordsToImport[i] = {};
        }

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
                                val = value.toString().split(" ");
                            }
                        }
                        // if the element is a group (the name pattern is something/something)
                        else if(q.name == key.toString().split('/')[0]){
                            if( q.type == 'multipletext'){
                                let arrTemp = [];
                                if (Array.isArray(recordsToImport[r][key.toString().split('/')[0]])) {
                                    arrTemp = recordsToImport[r][key.toString().split('/')[0]];
                                }
                                arrTemp.push(value);
                                val = arrTemp;
                            }
                            if( q.type == 'matrix'){
                                const n = key.toString().split('/')[1];
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
                        if( q.type != 'matrix' && q.type != 'matrixdropdown' )
                            recordsToImport[r][q.name] = val;
                    }
                }
                if(fieldInRecord == false){
                    console.log(q);
                    recordsToImport[r][q.name] = null;
                }
                else {
                    // re-init
                    fieldInRecord = false;
                }
            }
        }
        // console.log(recordsToImport);
        console.log('endOfFunction');
        res.send(recordsToImport);
        return recordsToImport;
    });
}
