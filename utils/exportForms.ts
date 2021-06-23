import request from "request"
import {Form} from '../models';
import {AppAbility} from "../security/defineAbilityFor";
import koboBuilder from "./files/koboBuilder";
import errors from "../const/errors";

let uid1;
let uid2;
let accessToken;
let finalRes;
let form;
let buffer;

export default async (req: any, res: any) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    form = await Form.findOne(filters);
    accessToken = req.body.aToken;
    finalRes = res;

    if (form) {
        await importFormAnd2More();
    } else {
        res.status(404).send(errors.dataNotFound);
    }
}

async function importFormAnd2More() {
    // CREATE EXCEL FILE
    console.log('CREATE EXCEL FILE');
    buffer = await koboBuilder(form);
    // console.log(form);

    // IMPORT EXCEL FILE
    console.log('IMPORT EXCEL FILE');
    const options = {
        'method': 'POST',
        'url': 'https://kobo.humanitarianresponse.info/api/v2/imports/?format=json',
        'headers': {
            'Authorization': `Token ${accessToken}`,
            'Accept': 'application/json',
        },
        formData: {
            'file': {
                'value': buffer,
                'options': {
                    'filename': 'test_import.xlsx',
                    'contentType': null
                }
            },
            'library': 'false',
            'name': 'form_' + Date.now().toString(),
        }
    };
    await request(options, function (error, response) {
        if (error) throw new Error(error);
        try{
            const body = JSON.parse(response.body.toString());
            uid1 = body.uid;
            console.log('uid1');
            console.log(uid1);
            getFormUidAnd1more();
        }
        catch (e){
            // console.log('Didn\'t work - Retry request (import xslx file - res not json format)');
            console.log(e);
        }
    });
}

function getFormUidAnd1more() {
    // GET UID OF THE NEW FORM
    console.log('GET UID OF THE NEW FORM');
    // have to put a timer, otherwise the request status is still in processing (instead of complete)

    const options = {
        'method': 'GET',
        'url': `https://kobo.humanitarianresponse.info/api/v2/imports/${uid1}/?format=json`,
        'headers': {
            'Authorization': `Token ${accessToken}`,
            'Accept': 'application/json',
        }
    };
    request(options, function (error, response) {
        if (error) throw new Error(error);
        try {
            const body = JSON.parse(response.body.toString());
            // when status is created against complete, message is empty
            if(body.status == 'complete') {
                uid2 = body.messages.created[0].uid;
                console.log('uid2');
                console.log(uid2);

                deployForm();
            }
            else {
                console.log('Didn\'t work - Retry request (get uid - res messages empty)');
                getFormUidAnd1more();
            }
        }
        catch (e) {
            // console.log('Didn\'t work - Retry request (get uid - res not json format)');
            console.log(e);
            getFormUidAnd1more();
        }
    });
}

function deployForm(){
    // DEPLOY FORM
    console.log('DEPLOY FORM');
    const options = {
        'method': 'POST',
        'url': `https://kobo.humanitarianresponse.info/api/v2/assets/${uid2}/deployment/?format=json`,
        'headers': {
            'Authorization': `Token ${accessToken}`,
        },
        formData: {
            'active': 'true'
        }
    };
    request(options, function (error, response) {
        if (error) throw new Error(error);
        console.log(response.body);
        try {
            console.log(response.body);
            const body = JSON.parse(response.body.toString());
            const url = body.asset.deployment__links.url;
            console.log('DEPLOYED');
            finalRes.send({url: url});
        }
        catch (e){
            // console.log('Didn\'t work - Retry request (deploy - res not json format)');
            console.log(e);
            deployForm();
        }
    });
}
