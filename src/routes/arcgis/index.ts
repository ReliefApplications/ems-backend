import express from 'express';
import { request as httpsRequest } from 'https';
import config from 'config';

/**
 * Endpoint for arcgis API call
 */
const router = express.Router();

/**
 * Build endpoint
 *
 * @param req current http request
 * @param res http response
 * @returns GeoJSON feature collection
 */
router.get('/data', async (req, res) => {
  try {
    const arcgisUrl = new URL(`${config.get('arcgis.api_url')}`);
    let path: any = req.query.path;
    path = path.includes('?')
      ? `${req.query.path}&apiKey=${config.get('arcgis.api_key')}`
      : `${req.query.path}?apiKey=${config.get('arcgis.api_key')}`;

    const options = {
      host: arcgisUrl.hostname,
      path: path,
      method: 'GET',
    };
    let statusCode = 200;
    const response = await new Promise((resolve, reject) => {
      let body: any = [];
      const request = httpsRequest(options, (resquest) => {
        statusCode = resquest.statusCode;
        if (resquest.statusCode < 200 || resquest.statusCode >= 300) {
          return reject(new Error('statusCode=' + resquest.statusCode));
        }
        resquest.on('data', function (chunk) {
          body.push(chunk);
        });
        resquest.on('end', function () {
          try {
            body = JSON.parse(Buffer.concat(body).toString());
          } catch (e) {
            reject(e);
          }
          return resolve(body);
        });
      });
      request.on('error', (e) => {
        reject(e.message);
      });
      request.end();
    });
    console.log('statusCode ==>> ', statusCode);
    res.status(statusCode).send(response);
  } catch (error) {
    console.log('try catch error ==>> ', error);
  }
});

export default router;
