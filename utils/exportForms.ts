import request from "request"
import {Form, Record} from '../models';
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

        console.log('$$$ accessToken $$$');
        console.log(req.body);
        console.log(accessToken);

        console.log('*** buffer ***');
        console.log(buffer);

        // IMPORT EXCEL FILE

        const options = {
            'method': 'POST',
            'url': 'https://kobo.humanitarianresponse.info/api/v2/imports/?format=json',
            'headers': {
                'Authorization':`Token ${accessToken}`,
                'Accept': 'application/json',
                // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
            },
            formData: {
                'file': {
                    'value': buffer,
                    // 'value': fs.createReadStream('/Users/martin/Desktop/Stage_ReliefApp/dev/divers/test_import.xlsx'),
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
            console.log('### FILE SEND ###');
            console.log(response.body);
            const body = JSON.parse(response.body.toString());
            console.log(body);
            uid1 = body.uid;
            console.log(uid1);
            console.log(`https://kobo.humanitarianresponse.info/api/v2/imports/${uid1}/?format=json`);

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
                        // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
                    }
                };
                request(options, function (error, response) {
                    if (error) throw new Error(error);
                    console.log('@@@ GET UID @@@');
                    console.log(response.body);
                    const body = JSON.parse(response.body.toString());
                    console.log(body);
                    uid2 = body.messages.created[0].uid;
                    console.log('*** uid2 ***');
                    console.log(uid2);

                    // DEPLOY FORM

                    const options = {
                        'method': 'POST',
                        'url': `https://kobo.humanitarianresponse.info/api/v2/assets/${uid2}/deployment/?format=json`,
                        'headers': {
                            'Authorization': `Token ${accessToken}`,
                            // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
                        },
                        formData: {
                            'active': 'true'
                        }
                    };
                    request(options, function (error, response) {
                        if (error) throw new Error(error);
                        // console.log(response.body);
                        const body = JSON.parse(response.body.toString());
                        const url = body.asset.deployment__links.url;
                        console.log(url);
                        res.send({url: url});
                    });
                });
            }, 5000);

            // setTimeout(() => {
            //     // GET UID OF THE NEW FORM
            //
            //     const options = {
            //         'method': 'GET',
            //         'url': `https://kobo.humanitarianresponse.info/api/v2/imports/${uid1}/?format=json`,
            //         'headers': {
            //             'Authorization':`Token ${process.env.TOKEN_KOBO}`,
            //             'Accept': 'application/json',
            //             // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
            //         }
            //     };
            //     request(options, function (error, response) {
            //         if (error) throw new Error(error);
            //         console.log('@@@ GET UID @@@');
            //         console.log(response.body);
            //         uid2 = response.body.messages.created[0].uid;
            //         console.log('*** uid2 ***');
            //         console.log(uid2);
            //     });
            // }, 5000);

        });

    } else {
        res.status(404).send(errors.dataNotFound);
    }
}
