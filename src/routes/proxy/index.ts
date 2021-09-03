import express from 'express';
import { ApiConfiguration } from '../../models';
import errors from '../../const/errors';
import { authType } from '../../const/enumTypes';
import * as CryptoJS from 'crypto-js';
import { request } from 'http';
import { proxyRequest } from 'http-proxy';

const router = express.Router();

/**
 * 
 * @param res 
 * @param targetError 
 * @param targetRes 
 */
// const copyResponse = (res, targetError, targetRes) => {
//     if (targetError) {
//         res.send(500, targetError);
//     } else {
//         res.status = targetRes.status;
//         res.statusCode = targetRes.statusCode;
//         res.send(targetRes.body);
//     }
// }

router.all('/:name', async (req, res) => {
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
    let err, forwardReq, options;
    try {
        const settings: { token: string } = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));
        const url = new URL('https://restcountries.eu/rest/v2/all');
        // const headers = Object.assign(req.headers, { authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyIsImtpZCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyJ9.eyJhdWQiOiJhcGk6Ly83NWRlY2EwNi1hZTA3LTQ3NjUtODVjMC0yM2U3MTkwNjI4MzMiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAvIiwiaWF0IjoxNjMwNTk1Mjc4LCJuYmYiOjE2MzA1OTUyNzgsImV4cCI6MTYzMDU5OTE3OCwiYWNyIjoiMSIsImFpbyI6IkFXUUFtLzhUQUFBQU9NbXdZeDB2V21FQ0I0ekNTanVlcnNwalVBL0M0ZEdyMW10ZHZiVUx3S0J1K2g0SkpoeUtvOTRmY1o0V0xoRFFkUUxROXN6a09vTCtiZnVwbDZqaDM5bUZySW13NEEzV0sxRW5tU2dRS1Yra0FubnlpVDVEL2JVUm1TUGFNTzJ1IiwiYW1yIjpbInB3ZCIsIm1mYSJdLCJhcHBpZCI6Ijg2NTA4ZjNhLWJmNDYtNDU3OS1iMWE5LThhYTZmMmJiYmMyNCIsImFwcGlkYWNyIjoiMCIsImVtYWlsIjoicGFjb21lQHJlbGllZmFwcGxpY2F0aW9ucy5vcmciLCJpZHAiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mYmFjZDQ4ZC1jY2Y0LTQ4MGQtYmFmMC0zMTA0ODM2ODA1NWYvIiwiaXBhZGRyIjoiMTA5LjEwLjE3My4yMCIsIm5hbWUiOiJQYWNvbWUgUml2aWVyZSIsIm9pZCI6IjUwODgxZjZmLTdhODAtNGVkNS1hZGI3LTdhM2E1Y2I2OTUyNiIsInB3ZF9leHAiOiIwIiwicHdkX3VybCI6Imh0dHBzOi8vcG9ydGFsLm1pY3Jvc29mdG9ubGluZS5jb20vQ2hhbmdlUGFzc3dvcmQuYXNweCIsInJoIjoiMC5BVWNBdDhBUTlpUzlPVXVCQ3ozQ2dLLTFrRHFQVUlaR3YzbEZzYW1LcHZLN3ZDUkhBTDguIiwic2NwIjoiYWNjZXNzX2FzX3VzZXIiLCJzaWQiOiI4NGMyMWQ0My1iYjA1LTQ5YTEtOGJiNS05NTQ2ZjUzODRiZmYiLCJzdWIiOiJjWDUzRG5FZDNuaG96SjBadk9zVE45WlRWTWprRm5kckJYc09pc09GbGdvIiwidGlkIjoiZjYxMGMwYjctYmQyNC00YjM5LTgxMGItM2RjMjgwYWZiNTkwIiwidW5pcXVlX25hbWUiOiJwYWNvbWVAcmVsaWVmYXBwbGljYXRpb25zLm9yZyIsInV0aSI6Il9iUXBwX2RpVmtDT2lKekRFRFVyQUEiLCJ2ZXIiOiIxLjAifQ.dMkxhVIxVtcYZsarwMVb-eZ6UNh7Qy_Iz8k5sRu2AUIhNpDLjgyN1QFETu1Z_Eb3BwxuRurvdRq9FkJMBjOgafVK4ZtEDGPfxlH_IAtMQvHda_wnOEEOGkTr4BSQuxITT1zehLBsemSJlDJv16ys2YwRzHfPcNs1mrBjoyzhmABGgycK6NkQ61-vg3QQCiaB-a-u40OEvcS6c8tmhj5MuOnyqkEGJkfACSIsDFi-1QkOyM2a6xrAtFvfqbNq9ZiE_FBlfk7PgnYfQan8vyhq_LpVELHUopHH4ofp1XwHiHfctmww97AmKnowC8TKVT27kbgWH0SEMG-CoiLwAzIpMQ' });
        // console.log(headers);
        options = {
            host: url.hostname,
            path: url.pathname,
            method: req.route.method,
            query: req.query,
            headers: req.headers,
            // agent: false
        };
        
        console.log(options);
        forwardReq = request(options, (forwardRes) => {
            // delete forwardRes.headers['set-cookie'];
            res.writeHead(forwardRes.statusCode, forwardRes.headers);
            forwardRes.on('data', (chunk) => {
                console.log('data')
                return res.write(chunk);
            });
            forwardRes.on('close', () => {
                console.log('close');
                return res.end();
            });
            return forwardRes.on('end', () => {
                console.log(forwardRes);
                return res.end();
            });
        }).on('error', () => {
            res.writeHead(503, {
                'Content-Type': 'text/plain'
            });
            res.write('Service currently unvailable');
            return res.end();
        });
        // forwardReq.write(JSON.stringify(req.body));
        return forwardReq.end();
    } catch (_error) {
        err = _error;
        console.log(err);
        try {
            res.status(503).send('Service currently unvailable');
        } catch (_error) {
            res.status(500).send(errors.invalidAPI);
        }
    }
});

export default router;
