import { ClientRequest } from 'http';
import { createProxyServer } from 'http-proxy';
import { authType } from '../../const/enumTypes';
import { ApiConfiguration } from '../../models';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import NodeCache from 'node-cache';
dotenv.config();
const cache = new NodeCache();

/**
 * Create the proxies for application based on API configurations.
 * @param app Application to build proxies on
 */
export const buildProxies = async (app): Promise<void> => {
    const apiConfigurations = await ApiConfiguration.find({ status: 'active' }).select('name authType endpoint settings');
    for (const apiConfiguration of apiConfigurations) {

        if (apiConfiguration.authType === authType.serviceToService) {

            // Retrieve credentials and set up authentication request
            const settings: { authTargetUrl: string, apiClientID: string, safeSecret: string, safeID: string }
            = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));
            const details = {
                'grant_type': 'client_credentials',
                'client_id': settings.apiClientID,
                'client_secret': settings.safeSecret,
                'resource': 'https://servicebus.azure.net'
            };
            const formBody = [];
            for (const property in details) {
            const encodedKey = encodeURIComponent(property);
            const encodedValue = encodeURIComponent(details[property]);
            formBody.push(encodedKey + '=' + encodedValue);
            }
            const body = formBody.join('&');

            // Create a single proxy server to authenticate AND access the API
            const proxy = createProxyServer({
                target: apiConfiguration.endpoint,
                changeOrigin: true,
            });
            
            // Redirect safe endpoint using proxy
            const safeEndpoint = `/${apiConfiguration.name}`;
            const tokenID = `bearer-token-${apiConfiguration.name}`;
            app.use(safeEndpoint, (req, res) => {
                const token = cache.get(tokenID);
                if (token) {
                    proxy.web(req, res, {target: apiConfiguration.endpoint });
                } else {
                    proxy.web(req, res, {target: settings.authTargetUrl });
                }
            });

            
            proxy.on('proxyReq', (proxyReq: ClientRequest) => {
                const token = cache.get(tokenID);
                if (token) {
                    proxyReq.setHeader('Authorization', 'Bearer ' + token);
                    proxyReq.setHeader('ConsumerId', settings.safeID);
                } else {
                    proxyReq.path = settings.authTargetUrl;
                    proxyReq.method = 'POST';
                    proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                    proxyReq.setHeader('Content-Length', body.length);
                    proxyReq.write(body);
                }
            });
            
            proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
                // If we were redirected to the authentication endpoint, store the token in the cache
                if (proxyRes.socket._httpMessage.path === settings.authTargetUrl) {
                    let body = '';
                    const _write = res.write;
                    const _end = res.end;
                    const _writeHead = res.writeHead;
                    let sendHeader = false;
                    res.writeHead = function (...args) {
                        if (sendHeader) {
                            _writeHead.apply(this, args);
                        }
                    }
                    res.write = function (data) {
                        body += data.toString('UTF8');
                    }
                    res.end = function (...args) {
                        sendHeader = true;
                        const parsed = JSON.parse(body);
                        cache.set(tokenID, parsed.access_token, parsed.expires_in - 60);
                        _write.apply(this, [ body ]);
                        _end.apply(this, args);
                    }
                }
            });
        
        } else if (apiConfiguration.authType === authType.userToService) {

            // Retrieve access token from settings
            const settings: { token: string } = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));//{ token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyIsImtpZCI6Im5PbzNaRHJPRFhFSzFqS1doWHNsSFJfS1hFZyJ9.eyJhdWQiOiJhcGk6Ly83NWRlY2EwNi1hZTA3LTQ3NjUtODVjMC0yM2U3MTkwNjI4MzMiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mNjEwYzBiNy1iZDI0LTRiMzktODEwYi0zZGMyODBhZmI1OTAvIiwiaWF0IjoxNjMwNDE2MzgyLCJuYmYiOjE2MzA0MTYzODIsImV4cCI6MTYzMDQyMDI4MiwiYWNyIjoiMSIsImFpbyI6IkFXUUFtLzhUQUFBQXErRjU1TTVUemw0S0xvUGZGUUdLNkVFNzR5bml1MWZrTE9DZlluVWxKa3V6U3BpZXlCMWhXWC9YU01aWEZ4OGQ3S3Fzcm5qQU80TVJjMHZZcEQ4UkVaUTBNRE5CUlpTWkRiakFLOFgzSWJSb0NYajc0OVgyU0VFWlFJQ2NSYWR4IiwiYW1yIjpbInB3ZCIsIm1mYSJdLCJhcHBpZCI6Ijg2NTA4ZjNhLWJmNDYtNDU3OS1iMWE5LThhYTZmMmJiYmMyNCIsImFwcGlkYWNyIjoiMCIsImVtYWlsIjoicGFjb21lQHJlbGllZmFwcGxpY2F0aW9ucy5vcmciLCJpZHAiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC9mYmFjZDQ4ZC1jY2Y0LTQ4MGQtYmFmMC0zMTA0ODM2ODA1NWYvIiwiaXBhZGRyIjoiMTA5LjEwLjE3My4yMCIsIm5hbWUiOiJQYWNvbWUgUml2aWVyZSIsIm9pZCI6IjUwODgxZjZmLTdhODAtNGVkNS1hZGI3LTdhM2E1Y2I2OTUyNiIsInB3ZF9leHAiOiIwIiwicHdkX3VybCI6Imh0dHBzOi8vcG9ydGFsLm1pY3Jvc29mdG9ubGluZS5jb20vQ2hhbmdlUGFzc3dvcmQuYXNweCIsInJoIjoiMC5BVWNBdDhBUTlpUzlPVXVCQ3ozQ2dLLTFrRHFQVUlaR3YzbEZzYW1LcHZLN3ZDUkhBTDguIiwic2NwIjoiYWNjZXNzX2FzX3VzZXIiLCJzaWQiOiI4NGMyMWQ0My1iYjA1LTQ5YTEtOGJiNS05NTQ2ZjUzODRiZmYiLCJzdWIiOiJjWDUzRG5FZDNuaG96SjBadk9zVE45WlRWTWprRm5kckJYc09pc09GbGdvIiwidGlkIjoiZjYxMGMwYjctYmQyNC00YjM5LTgxMGItM2RjMjgwYWZiNTkwIiwidW5pcXVlX25hbWUiOiJwYWNvbWVAcmVsaWVmYXBwbGljYXRpb25zLm9yZyIsInV0aSI6InBtd3ljT0h0bVUyN2FjQ19NZzZvQUEiLCJ2ZXIiOiIxLjAifQ.WQGVeAv_vke-6Kwy1h-SKep5_-nhhzGbxjX-UFePOKDRd7SjVUNVEGhlLFxnioCbXsH4jKRAZg6phpwGSghl2llZ7L01ont-TGcRttKPurNONKZRn8RMqjmRFcfe3s777cwqkTWiDxPUy9C-WVWnD97EVfSCOMyGW3C12uzJ5UhKY8B5fHWBQ5QCE0U35SpwXUbuS2zvFqi2tam2nHkz2WI_Lmi29hCeTP0VowW-9orbbQ_B6GrW3MP_wuTc7w_9pR3_RdxvKw4LmysSPqy9fmR6jKHW0o2bab1JsoaSnFDDVNau--3Athl4vZsyB1JWEPP_hTM2vW6fonvudQzz-w" };

            // Create a single proxy server to authenticate AND access the API
            const proxy = createProxyServer({
                target: apiConfiguration.endpoint,
                changeOrigin: true,
            });
            
            // Redirect safe endpoint using proxy
            const safeEndpoint = `/${apiConfiguration.name}`;
            app.use(safeEndpoint, (req, res) => {
                proxy.web(req, res, {target: apiConfiguration.endpoint });
            });

            proxy.on('proxyReq', (proxyReq: ClientRequest) => {
                proxyReq.setHeader('Authorization', 'Bearer ' + settings.token);
            });
        }
        console.log(`🚀 Successfully built ${apiConfiguration.name} proxy`);
    }
}
