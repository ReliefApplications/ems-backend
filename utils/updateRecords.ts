import request from "request"
import recordReader from "./files/recordReader";

let records: any;

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

    const reg = new RegExp('.+ .+');
    // a2MN6zEzV6pXMbY3Jx7iCr
    // aK3TovsSRkTZJPtgNXwGEQ
    // atNAFqYhKhkyDce3eN5CQq


    const options = {
        'method': 'GET',
        'url': 'https://kobo.humanitarianresponse.info/assets/atNAFqYhKhkyDce3eN5CQq/submissions/?format=json',
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
            for (const i in records){
                // Each element of record
                let val;
                for (const [key, value] of Object.entries(records[i])){
                    val = value;
                    if( q.name == key || q.name ==  key.toString().split('/')[0]){
                        // console.log('Match!' + q + '==' + key);
                        for (const e of form.fields){
                            // if the element is normal
                            if(e.name == key){
                                // console.log('### 0 ###');
                                // console.log(e.name);
                                // console.log(key);

                                // console.log('e.name');
                                // console.log(e.name);

                                if(e.type == 'tagbox' || e.type == 'checkbox'){
                                    // console.log('e.type');
                                    // console.log(e.type);
                                    // console.log('e.name');
                                    // console.log(e.name);

                                    val = value.toString().split(" ");
                                }
                            }
                            // if the element is a group (the name pattern is something/something)
                            // console.log(key.toString().split('/'));
                            else if(e.name == key.toString().split('/')[0]){
                                // console.log('### 1 ###');
                                // console.log('------------------------------------');
                                // console.log(key.toString().split('/')[0]);
                                // console.log(e.name);
                                // console.log('------------------------------------');

                                if( e.type == 'multipletext'){
                                    // console.log('### 2 ###');
                                    // console.log(key.toString().split('/')[0]);
                                    // recordsToImport[i][key.toString().split('/')[0]].push(value);

                                    // const arrTemp = recordsToImport[i][key.toString().split('/')[0]];
                                    // arrTemp[i][key.toString().split('/')[0]].push(value);
                                    // val = arrTemp;

                                    // console.log('e.name');
                                    // console.log(e.name);

                                    let arrTemp = [];
                                    if (Array.isArray(recordsToImport[i][key.toString().split('/')[0]])) {
                                        arrTemp = recordsToImport[i][key.toString().split('/')[0]];
                                        arrTemp.push(value);
                                    } else {
                                        arrTemp.push(value);
                                    }
                                    val = arrTemp;
                                    // console.log(val);
                                }
                            }
                        }
                        recordsToImport[i][q.name] = val;
                    }
                }
            }
        }
        console.log(recordsToImport);
    });
}
