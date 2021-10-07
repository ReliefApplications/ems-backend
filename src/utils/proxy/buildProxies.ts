import { ClientRequest } from 'http';
import { createProxyServer } from 'http-proxy';
import { authType } from '../../const/enumTypes';
import { ApiConfiguration } from '../../models';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import { getToken } from './authManagement';
dotenv.config();

/**
 * Create the proxies for application based on API configurations.
 * @param app Application to build proxies on
 */
export const buildProxies = async (app): Promise<void> => {
    const apiConfigurations = await ApiConfiguration.find({ status: 'active' }).select('name authType endpoint settings id');

    // Loop through all the ApiConfigurations
    for (const apiConfiguration of apiConfigurations) {

        // Retrieve and decrypt ApiConfiguration settings
        const settings = JSON.parse(CryptoJS.AES.decrypt(apiConfiguration.settings, process.env.AES_ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8));

        // Define proxy's route
        const safeEndpoint = `/${apiConfiguration.name}`;
        
        // Add a middleware to fetch the auth token, only working workaround from this thread:
        // https://github.com/chimurai/http-proxy-middleware/issues/318#issuecomment-582098177
        app.use(safeEndpoint, (req, res, next) => {
            getToken(apiConfiguration).then(token => {
                req.__token = token;
                next();
            });
        });

        // Create a proxy server to access the external API
        const proxy = createProxyServer({
            target: apiConfiguration.endpoint,
            changeOrigin: true,
        });

        // Redirect safe endpoint using proxy
        app.use(safeEndpoint, (req, res) => {
            proxy.web(req, res, { target: apiConfiguration.endpoint });
        });

        // On proxy request, attach headers with auth token
        proxy.on('proxyReq', (proxyReq: ClientRequest, req) => {
            // Attach auth token
            proxyReq.setHeader('Authorization', 'Bearer ' + req.__token);
            // Attach additional headers in specific cases
            if (apiConfiguration.authType === authType.serviceToService && !settings.scope && settings.safeID) {
                proxyReq.setHeader('ConsumerId', settings.safeID);
            }
        });

        console.log(`🚀 Successfully built ${apiConfiguration.name} proxy`);
    }
}
