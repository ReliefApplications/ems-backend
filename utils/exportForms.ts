import request from "request"
import {Form} from '../models';
import {AppAbility} from "../security/defineAbilityFor";
import koboBuilder from "./files/koboBuilder";
import errors from "../const/errors";

export default async (req: any, res: any) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    const accessToken = req.body.accessToken;
    let buffer;
    let uid1;
    let uid2;
    if (form) {

        // CREATE EXCEL FILE
        buffer = await koboBuilder(form);

        // IMPORT EXCEL FILE
        const options = {
            'method': 'POST',
            'url': 'https://kobo.humanitarianresponse.info/api/v2/imports/?format=json',
            'headers': {
                'Authorization':`Token ${accessToken}`,
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
                'name': 'form_'+Date.now().toString(),
            }
        };
        await request(options, function (error, response) {
            if (error) throw new Error(error);
            const body = JSON.parse(response.body.toString());
            uid1 = body.uid;

            // GET UID OF THE NEW FORM
            // have to put a timer, otherwise the request status is still in processing (instead of complete)
            // 5 seconds is enough
            setTimeout(() => {
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
                    const body = JSON.parse(response.body.toString());
                    uid2 = body.messages.created[0].uid;
                    console.log('*** uid2 ***');
                    console.log(uid2);

                    // DEPLOY FORM
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
                        const body = JSON.parse(response.body.toString());
                        const url = body.asset.deployment__links.url;
                        res.send({url: url});
                    });
                });
            }, 5000);
        });

    } else {
        res.status(404).send(errors.dataNotFound);
    }
}
