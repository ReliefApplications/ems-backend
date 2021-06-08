import { ClientRequest } from "http";
import { createProxyServer } from "http-proxy";
import { authType } from "../const/enumTypes";
import { ApiConfiguration } from "../models";
import * as CryptoJS from "crypto-js";
import * as dotenv from 'dotenv';
import NodeCache from 'node-cache';
dotenv.config();
const cache = new NodeCache();

export default async function (app) {

    const apiConfigurations = await ApiConfiguration.find({ status: 'active' }).select('name authType settings');
    for (const apiConfiguration of apiConfigurations) {

        if (apiConfiguration.authType === authType.serviceToService) {

            // Retrieve credentials and set up authentication request
            const settings: { apiBaseUrl: string, authTargetUrl: string, apiClientID: string, safeSecret: string, safeID: string }
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
            formBody.push(encodedKey + "=" + encodedValue);
            }
            const body = formBody.join("&");

            // === API BASE URL TO REMOVE ===
            settings.apiBaseUrl = 'https://portal-test.who.int/eios/API/News/Service';
            // === API BASE URL TO REMOVE ===

            // Create a single proxy server to authenticate AND access the API
            const proxy = createProxyServer({
                target: settings.apiBaseUrl,
                changeOrigin: true,
            });
            
            // Redirect safe endpoint using proxy
            const safeEndpoint = `/${apiConfiguration.name}`;
            const tokenID = `bearer-token-${apiConfiguration.name}`;
            app.use(safeEndpoint, (req, res) => {
                const token = cache.get(tokenID);
                if (token) {
                    proxy.web(req, res, {target: settings.apiBaseUrl });
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
        }
    }
}