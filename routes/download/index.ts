import express from 'express';
import errors from '../../const/errors';
import { Form, Record, Resource } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import downloadFile from '../../utils/downloadFile';
import getPermissionFilters from '../../utils/getPermissionFilters';
import fs from 'fs';
import fileBuilder from "../../utils/files/fileBuilder";
import koboBuilder from "../../utils/files/koboBuilder";
import request from "request"

/* CSV or xlsx export of records attached to a form.
*/
const router = express.Router();
router.get('/form/records/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    if (form) {
        let records = [];
        let permissionFilters = [];
        if (ability.cannot('read', 'Record')) {
            permissionFilters = getPermissionFilters(req.context.user, form, 'canSeeRecords');
            if (permissionFilters.length) {
                records = await Record.find({ $and: [{ form: req.params.id }, { $or: permissionFilters }] });
            }
        } else {
            records = await Record.find({ form: req.params.id });
        }

        const fields = form.fields.map(x => x.name);
        const data = records.map(x => x.data);
        const type = req.query ? req.query.type : 'xlsx';
        return fileBuilder(res, form.name, fields, data, type);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of records attached to a resource.
*/
router.get('/resource/records/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Resource.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const resource = await Resource.findOne(filters);
    if (resource) {
        let records = [];
        if (ability.can('read', 'Record')) {
            records = await Record.find({ resource: req.params.id });
        }
        const fields = resource.fields.map(x => x.name);
        const data = records.map(x => x.data);
        const type = req.query ? req.query.type : 'xlsx';
        return fileBuilder(res, resource.name, fields, data, type);
    } else {
        res.status(404).send(errors.dataNotFound);
    }
});

/* CSV or xlsx export of list of records.
*/
router.get('/records', async (req, res) => {
    const ids = req.query?.ids.toString().split(',') || [];
    const ability: AppAbility = req.context.user.ability;
    if (ids.length > 0) {
        let permissionFilters = [];
        const record: any = await Record.findById(ids[0]).populate({
            path: 'form',
            model: 'Form'
        });
        const form = record.form;
        if (form) {
            const type = req.query ? req.query.type : 'xlsx';
            const fields = form.fields.map(x => x.name);
            if (ability.cannot('read', 'Record')) {
                permissionFilters = getPermissionFilters(req.context.user, form, 'canSeeRecords');
                if (permissionFilters.length) {
                    const records = await Record.find({ $and: [
                        { _id: { $in: ids } },
                        { form: form.id },
                        { $or: permissionFilters }
                    ]});
                    const data = records.map(x => x.data);
                    return fileBuilder(res, form.name, fields, data, type);
                }
            } else {
                const records = await Record.find({ $and: [
                    { _id: { $in: ids } },
                    { form: form.id }
                ]});
                const data = records.map(x => x.data);
                return fileBuilder(res, form.name, fields, data, type);
            }
        }
    }
    res.status(404).send(errors.dataNotFound);
});

/* Export of file
*/
router.get('/file/:form/:blob', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const form: Form = await Form.findById(req.params.form);
    if (!form) {
        res.status(404).send(errors.dataNotFound);
    }
    if (ability.cannot('read', form)) {
        res.status(403).send(errors.permissionNotGranted);
    }
    await downloadFile(req.params.form, req.params.blob);
    res.download(`files/${req.params.blob}`, () => {
        fs.unlink(`files/${req.params.blob}`, () => {
            console.log('file deleted');
        });
    });
});

/* CSV or xlsx export of a form.
*/
router.get('/form/kobo/:id', async (req, res) => {
    const ability: AppAbility = req.context.user.ability;
    const filters = Form.accessibleBy(ability, 'read').where({_id: req.params.id}).getFilter();
    const form = await Form.findOne(filters);
    let buffer;
    let uid1;
    let uid2;
    if (form) {

        // CREATE EXCEL FILE

        buffer = await koboBuilder(res, form);
        console.log('*** buffer ***');
        console.log(buffer);

        // IMPORT EXCEL FILE

        const options = {
            'method': 'POST',
            'url': 'https://kobo.humanitarianresponse.info/api/v2/imports/?format=json',
            'headers': {
                'Authorization':`Token ${process.env.TOKEN_KOBO}`,
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
            console.log(body['uid']);
            console.log(body.uid);
            uid1 = body.uid;
            console.log(uid1);
            console.log(`https://kobo.humanitarianresponse.info/api/v2/imports/${uid1}/?format=json`);

            // GET UID OF THE NEW FORM

            const options = {
                'method': 'GET',
                'url': `https://kobo.humanitarianresponse.info/api/v2/imports/${uid1}/?format=json`,
                'headers': {
                    'Authorization':`Token ${process.env.TOKEN_KOBO}`,
                    'Accept': 'application/json',
                    // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
                }
            };
            request(options, function (error, response) {
                if (error) throw new Error(error);
                console.log('@@@ GET UID @@@');
                console.log(response.body);
                const body = JSON.parse(response.body.toString());
                uid2 = body.messages.created[0].uid;
                console.log('*** uid2 ***');
                console.log(uid2);

                // DEPLOY FORM

                const options = {
                    'method': 'POST',
                    'url': `https://kobo.humanitarianresponse.info/api/v2/assets/${uid2}/deployment/?format=json`,
                    'headers': {
                        'Authorization': `Token ${process.env.TOKEN_KOBO}`,
                        // 'Cookie': 'csrftoken=tEJ8gIf31yRCPt2nWt62UnZH7yZBKuiv4elnE8YKu2OZTz3p0sAYuY5hc4qU3qPy'
                    },
                    formData: {
                        'active': 'true'
                    }
                };
                request(options, function (error, response) {
                    if (error) throw new Error(error);
                    console.log(response.body);
                    const body = JSON.parse(response.body.toString());
                    const url = body.asset.deployment__links.url;
                    // TODO:
                    // res.send(url)
                    // manage the return of this request (before the frontend was waiting for a file, that not the case anymore)
                    // display the url in the frontend
                    // and store it somewhere
                });

            });

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
});

export default router;
