import request from 'request'
import {Form} from '../models';
import {AppAbility} from '../security/defineAbilityFor';
import koboBuilder from './files/koboBuilder';
import errors from '../const/errors';

let uid1;
let uid2;
let accessToken;
let finalRes;
let form;
let buffer;

//1 second
const delayRequest = 1000;

export default async (req: any, res: any) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    form = await Form.findOne(filters);
    accessToken = req.body.aToken;
    finalRes = res;

    if (form.fields.length == 0) {
        res.status(404).send('Empty form');
    } else if(!form) {
        res.status(404).send(errors.dataNotFound);
    } else {
        await importFormAnd2More(form);
    }
}

async function importFormAnd2More(form: any) {
    // CREATE EXCEL FILE
    console.log('CREATE EXCEL FILE');
    console.log(form);
    buffer = await koboBuilder(form);

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
            'name': form.name + '_' + Date.now().toString(),
        }
    };
    await request(options, function (error, response) {
        if (error) throw new Error(error);
        try{
            const body = JSON.parse(response.body.toString());
            uid1 = body.uid;
            console.log('uid1');
            console.log(uid1);
            getFormUidAnd1more(form);
        }
        catch (e){
            setTimeout(() => {
                console.log(e);
                importFormAnd2More(form);
            }, delayRequest)
        }
    });
}

function getFormUidAnd1more(form: any) {
    // GET UID OF THE NEW FORM
    console.log('GET UID OF THE NEW FORM');
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

                deployForm(form);
            }
            else {
                setTimeout(() => {
                    console.log('Didn\'t work - Retry request (get uid - res messages empty)');
                    console.log(body);
                    getFormUidAnd1more(form);
                }, delayRequest)
            }
        }
        catch (e) {
            setTimeout(() => {
                console.log(e);
                getFormUidAnd1more(form);
            }, delayRequest)
        }
    });
}

function deployForm(form: any){
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
            Form.findByIdAndUpdate(form.id, {
                koboUrl: url,
                uid: uid2,
            }, () => {
                console.log('DEPLOYED');
                finalRes.send({url: url});
            });
        }
        catch (e){
            setTimeout(() => {
                console.log(e);
                deployForm(form);
            }, delayRequest)
        }
    });
}
