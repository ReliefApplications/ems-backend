import express from 'express';
import { ApiConfiguration } from '@models';
import { getToken } from '@utils/proxy';
import { get, isEmpty } from 'lodash';
import i18next from 'i18next';
import { logger } from '@services/logger.service';
import config from 'config';
import * as CryptoJS from 'crypto-js';
import axios from 'axios';
import { createClient, RedisClientType } from 'redis';

/** Express router */
const router = express.Router();

/** Placeholder to hide settings in UI once saved */
const SETTING_PLACEHOLDER = '●●●●●●●●●●●●●';

/**
 * Proxy API request
 *
 * @param req request
 * @param res response
 * @param api api configuration
 * @param path url path
 * @returns API request
 */
const proxyAPIRequest = async (req, res, api, path) => {
  try {
    let client: RedisClientType;
    if (config.get('redis.url') && req.method === 'get') {
      client = createClient({
        url: config.get('redis.url'),
        password: config.get('redis.password'),
      });
      client.on('error', (error) => logger.error(`REDIS: ${error}`));
      await client.connect();
    }
    // Add / between endpoint and path, and ensure that double slash are removed
    const url = `${api.endpoint.replace(/\$/, '')}/${path}`.replace(
      /([^:]\/)\/+/g,
      '$1'
    );
    const cacheData = client ? await client.get(url) : null;
    if (cacheData) {
      logger.info(`REDIS: get key : ${url}`);
      res.status(200).send(JSON.parse(cacheData));
    } else {
      const token = await getToken(api);
      await axios({
        url,
        method: req.method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        maxRedirects: 5,
        ...(!isEmpty(req.body) && {
          data: JSON.stringify(req.body),
        }),
      })
        .then(async ({ data, status }) => {
          if (
            client &&
            ['service-to-service', 'public'].includes(api.authType) &&
            status === 200
          ) {
            await client
              .set(url, JSON.stringify(data), {
                EX: 60 * 60 * 24, // set a cache of one day
              })
              .then(() => logger.info(`REDIS: set key : ${url}`));
          }
          res.status(200).send(data);
        })
        .catch((err) => {
          logger.error(err.message, { stack: err.stack });
          return res.status(503).send('Service currently unavailable');
        });
    }
    if (client) {
      await client.disconnect();
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
};

router.post('/ping/**', async (req, res) => {
  try {
    const body = req.body;
    if (body) {
      const api = await ApiConfiguration.findById(req.body.id).select(
        'name authType endpoint pingUrl settings id'
      );
      if (!api) {
        return res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }
      // Decrypt settings
      const settings: {
        authTargetUrl: string;
        apiClientID: string;
        safeSecret: string;
        scope: string;
      } = !isEmpty(api.settings)
        ? JSON.parse(
            CryptoJS.AES.decrypt(
              api.settings,
              config.get('encryption.key')
            ).toString(CryptoJS.enc.Utf8)
          )
        : {};
      const parameters = {
        ...body,
        settings: {
          authTargetUrl:
            get(body, 'settings.authTargetUrl', SETTING_PLACEHOLDER) !==
            SETTING_PLACEHOLDER
              ? get(body, 'settings.authTargetUrl')
              : get(settings, 'authTargetUrl'),
          apiClientID:
            get(body, 'settings.apiClientID', SETTING_PLACEHOLDER) !==
            SETTING_PLACEHOLDER
              ? get(body, 'settings.apiClientID')
              : get(settings, 'apiClientID'),
          safeSecret:
            get(body, 'settings.safeSecret', SETTING_PLACEHOLDER) !==
            SETTING_PLACEHOLDER
              ? get(body, 'settings.safeSecret')
              : get(settings, 'safeSecret'),
          scope:
            get(body, 'settings.scope', SETTING_PLACEHOLDER) !==
            SETTING_PLACEHOLDER
              ? get(body, 'settings.scope')
              : get(settings, 'scope'),
        },
      };

      req.method = 'GET';
      await proxyAPIRequest(req, res, parameters, api.pingUrl);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Forward requests to actual API using the API Configuration
 */
router.all('/:name/**', async (req, res) => {
  try {
    const api = await ApiConfiguration.findOne({
      $or: [{ name: req.params.name }, { id: req.params.name }],
      status: 'active',
    }).select('name authType endpoint settings id');
    if (!api) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const path = req.originalUrl.split(req.params.name).pop().substring(1);
    await proxyAPIRequest(req, res, api, path);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;

// === PREVIOUS CODE OF PROXY REQUEST ===
// try {
//   req.pause();

//   // Add / between endpoint and path, and ensure that double slash are removed
//   const url = new URL(
//     `${api.endpoint.replace(/\$/, '')}/${path}`.replace(/([^:]\/)\/+/g, '$1')
//   );
//   headers.host = url.hostname;
//   const protocol = api.endpoint.startsWith('https') ? 'https:' : 'http:';
//   const options: any = {
//     protocol,
//     host: url.hostname,
//     path: url.pathname,
//     method: req.method,
//     headers: headers,
//     agent: false,
//   };
//   const request = protocol === 'https:' ? httpsRequest : httpRequest;
//   try {
//     const forwardReq = request(options, (forwardRes) => {
//       forwardRes.pause();
//       forwardRes.headers['access-control-allow-origin'] = '*';
//       // Check the status and throw error if it's not any of the following
//       switch (forwardRes.statusCode) {
//         case 200:
//         case 201:
//         case 202:
//         case 203:
//         case 204:
//         case 205:
//         case 206:
//         case 304:
//         case 400:
//         case 401:
//         case 402:
//         case 403:
//         case 404:
//         case 405:
//         case 406:
//         case 407:
//         case 408:
//         case 409:
//         case 410:
//         case 411:
//         case 412:
//         case 413:
//         case 414:
//         case 415:
//         case 416:
//         case 417:
//         case 418:
//           res.writeHead(forwardRes.statusCode, forwardRes.headers);
//           forwardRes.pipe(res, { end: true });
//           forwardRes.resume();
//           break;

//         default:
//           const stringifiedHeaders = JSON.stringify(
//             forwardRes.headers,
//             null,
//             4
//           );
//           forwardRes.resume();
//           res.writeHead(500, {
//             'content-type': 'text/plain',
//           });
//           res.end(
//             process.argv.join(' ') +
//               ':\n\nError ' +
//               forwardRes.statusCode +
//               '\n' +
//               stringifiedHeaders
//           );
//           break;
//       }
//     }).on('error', () => {
//       res.writeHead(503, {
//         'Content-Type': 'text/plain',
//       });
//       res.write('Service currently unavailable');
//       return res.end();
//     });
//     req.pipe(forwardReq, { end: true });
//     if (!isEmpty(req.body)) {
//       forwardReq.write(JSON.stringify(req.body));
//     }
//     req.resume();
//   } catch (err) {
//     logger.error(err.message, { stack: err.stack });
//     return res.status(503).send('Service currently unavailable');
//   }
// } catch (err) {
//   logger.error(err.message, { stack: err.stack });
//   return res.status(500).send(req.t('common.errors.internalServerError'));
// }
