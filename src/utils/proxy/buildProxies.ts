import { ClientRequest } from 'http';
import { createProxyServer } from 'http-proxy';
import { ApiConfiguration } from '../../models';
import { getToken } from './authManagement';

/**
 * Create the proxies for application based on API configurations.
 * @param app Application to build proxies on
 */
export const buildProxies = async (app): Promise<void> => {
  const apiConfigurations = await ApiConfiguration.find({ status: 'active' }).select('name authType endpoint settings id');

  // Loop through all the ApiConfigurations
  for (const apiConfiguration of apiConfigurations) {

    // Define proxy's route
    const safeEndpoint = `/${apiConfiguration.name}`;
        
    // Add a middleware to fetch the auth token, only working workaround from this thread:
    // https://github.com/chimurai/http-proxy-middleware/issues/318#issuecomment-582098177
    app.use(safeEndpoint, (req, res, next) => {
      console.log(apiConfiguration.name);
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
      console.log(apiConfiguration.name + 2);
      proxy.web(req, res, { target: apiConfiguration.endpoint });
    });

    // On proxy request, attach headers with auth token
    proxy.on('proxyReq', (proxyReq: ClientRequest, req) => {
      // Attach auth token
      console.log(apiConfiguration.name + 3);
      proxyReq.setHeader('Authorization', 'Bearer ' + req.__token);
    });

    // Prevent crashing if request is aborted by client before being fullfilled
    proxy.on('error', (err, req, res) => {
      console.log(apiConfiguration.name + 4);
      console.log(`${apiConfiguration.name} threw following error: ${err}`);
      console.log(req);
      req.destroy();
      // res.writeHead(500, {
      //   'Content-Type': 'text/plain',
      // });
      console.log('destroy');
      res.status(400).send(`${apiConfiguration.name} threw following error: ${err}`);
      // res.end(`${apiConfiguration.name} threw following error: ${err}`);
    });

    console.log(`🚀 Successfully built ${apiConfiguration.name} proxy`);
  }
};
