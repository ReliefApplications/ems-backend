import request from "request"

export default async (form: any) => {

    console.log("***");
    console.log(form);
    console.log("***");
    console.log(form.fields);
    console.log("***");
    for (const e of form.fields){
        console.log(e.type);
    }
    console.log("***");

    // a2MN6zEzV6pXMbY3Jx7iCr
    // aK3TovsSRkTZJPtgNXwGEQ
    // atNAFqYhKhkyDce3eN5CQq

    // aN5SzmYrAiPWJhi4CJoGSW


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
        console.log(response.body);

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
                        // for (const e of form.fields){
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
                                        arrTemp.push(value);
                                    } else {
                                        arrTemp.push(value);
                                    }
                                    val = arrTemp;
                                    // console.log(val);
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
                                    // const n2 = n.split('_',1)[1];
                                    const n2 = n.substr(n.indexOf('_')+1);
                                    // console.log(n2);
                                    if(recordsToImport[r][q.name] == null){
                                        // console.log(n2 + ' ' + 'null');
                                        recordsToImport[r][q.name] = {};
                                    }
                                    console.log('BEFORE');
                                    console.log(recordsToImport[r][q.name]);
                                    console.log(n2);
                                    if(recordsToImport[r][q.name][n2] == null){
                                        console.log('AFTER');
                                        // console.log(n2 + ' ' + 'null 2');
                                        // console.log(recordsToImport[r][q.name][n2]);

                                        // console.log('n4');
                                        // console.log(n4);
                                        recordsToImport[r][q.name][n2] = {};
                                    }
                                    const n3 = key.toString().split('/')[2];
                                    // console.log('n3');
                                    // console.log(n3);
                                    const n4 = n3.split(n+'_')[1];
                                    recordsToImport[r][q.name][n2][n4] = value;
                                    console.log(recordsToImport[r][q.name]);
                                    // recordsToImport[r][q.name][n2] = value;
                                    // console.log(recordsToImport[r][q.name][n2]);
                                }
                            }
                        // }
                        if( q.type != 'matrix' && q.type != 'matrixdropdown' )
                            recordsToImport[r][q.name] = val;
                    }
                }
            }
        }
        console.log(recordsToImport);
        console.log(recordsToImport[0]['q11']);
    });
}
