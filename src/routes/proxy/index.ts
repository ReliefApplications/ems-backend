import express from 'express';
import { ApiConfiguration } from '../../models';
import errors from '../../const/errors';
import { authType } from '../../const/enumTypes';
import * as CryptoJS from 'crypto-js';
import http from 'http';

const router = express.Router();

router.all('/:name/:path', async (req, res) => {
    console.log('there');
    const apiConfiguration = await ApiConfiguration.findOne({ name: req.params.name, status: 'active' }).select('name authType endpoint settings');
    if (!apiConfiguration) {
        res.status(404).send(errors.dataNotFound);
    }
    switch (apiConfiguration.authType) {
        case authType.serviceToService: {
            break;
        }
        case authType.userToService: {
            break;
        }
        default: {
            res.status(404).send(errors.invalidAPI);
        }
    }
    const settings: { token: string } = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));
    // const settings: { authTargetUrl: string, apiClientID: string, safeSecret: string, safeID: string }
    //     = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));
    // const details = {
    //     'grant_type': 'client_credentials',
    //     'client_id': settings.apiClientID,
    //     'client_secret': settings.safeSecret,
    //     'resource': 'https://servicebus.azure.net'
    // };
    const formBody = [];
    // for (const property in details) {
    //     const encodedKey = encodeURIComponent(property);
    //     const encodedValue = encodeURIComponent(details[property]);
    //     formBody.push(encodedKey + '=' + encodedValue);
    // }
    const url = new URL(apiConfiguration.endpoint + req.params.path);
    console.log(url);
    const body = formBody.join('&');
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': body.length,
        'Authorization': `Bearer ${settings.token}`
    };
    const options = {
        host: url.hostname,
        path: url.pathname,
        method: 'GET',
        headers
    };
    
    // const url = new URL(settings.authTargetUrl);
    // const options = {
    //     host: url.hostname,
    //     path: url.pathname,
    //     method: 'POST',
    //     headers
    // };
    const proxyReq = http.request(options, proxyRes => {
        proxyRes.setEncoding('utf8');
        res.writeHead(proxyRes.statusCode);
        proxyRes.on('data', chunk => {
            console.log('hi');
            res.write(chunk);
        });
        proxyRes.on('close', () => {
            console.log('ha');
            res.end();
        });
        proxyRes.on('end', () => {
            console.log('hu');
            res.end();
        });
    }).on('error', err => {
        console.log('ho');
        console.log(err.message);
        try {
            res.status(500).send(err.message);
        } catch {
            res.status(500).send(errors.invalidAPI);
        }
    });
    // console.log(proxyReq);
    proxyReq.end();
});

export default router;
