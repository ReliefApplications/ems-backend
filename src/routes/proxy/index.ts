import express, { Request, Response } from 'express';
import { ApiConfiguration } from '@models';
import { getToken } from '@utils/proxy';
import { get, isEmpty, lowerCase } from 'lodash';
import i18next from 'i18next';
import { logger } from '@services/logger.service';
import config from 'config';
import * as CryptoJS from 'crypto-js';
import axios from 'axios';
import { authType } from '@const/enumTypes';
import jwtDecode from 'jwt-decode';
import redis from '../../server/redis';
import { RedisClientType } from 'redis';

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
 * @param ping bool: are we executing a ping request
 * @returns API request
 */
const proxyAPIRequest = async (
  req: Request,
  res: Response,
  api: ApiConfiguration,
  path: string,
  ping = false
) => {
  try {
    let client: RedisClientType;
    if (lowerCase(req.method) === 'get' && !ping) {
      client = await redis();
    }
    // Generate a hash, taking into account the request body when storing data
    const bodyHash = CryptoJS.SHA256(JSON.stringify(req.body)).toString(
      CryptoJS.enc.Hex
    );
    // Add / between endpoint and path, and ensure that double slash are removed
    const url = `${api.endpoint.replace(/\$/, '')}/${path}`.replace(
      /([^:]\/)\/+/g,
      '$1'
    );
    // Create a cache key taking into account the body of the request, and making a user-dependant cache for auth code
    const cacheKey = [authType.serviceToService, authType.public].includes(
      api.authType
    )
      ? `${url}/${bodyHash}`
      : `${jwtDecode<any>(req.headers.authorization).name}:${url}/${bodyHash}`;
    // Get data from the cache
    const cacheData = client ? await client.get(cacheKey) : null;
    if (cacheData) {
      logger.info(`REDIS: get key : ${url}`);
      res.status(200).send(JSON.parse(cacheData));
    } else {
      const token = await getToken(api, req.headers.accesstoken, ping);
      await axios({
        url,
        method: req.method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        maxRedirects: 35,
        ...(!isEmpty(req.body) && {
          data: JSON.stringify(req.body),
        }),
      })
        .then(async ({ data, status }) => {
          // We are only caching the results of requests that are not user-dependent.
          // Otherwise, unwanted users could access cached data of other users.
          // As an improvement, we could include a stringified unique property of the user to the cache-key to enable user-specific cache.
          if (
            client &&
            [authType.serviceToService, authType.public].includes(
              api.authType
            ) &&
            status === 200
          ) {
            await client
              .set(cacheKey, JSON.stringify(data), {
                EX: 60 * 60 * 24, // set a cache of one day
              })
              .then(() => logger.info(`REDIS: set key : ${cacheKey}`));
          }
          if (client && api.authType === authType.authorizationCode) {
            await client
              .set(cacheKey, JSON.stringify(data), {
                EX: 60 * 60 * 24, // set a cache of one day
              })
              .then(() => logger.info(`REDIS: set key : ${cacheKey}`));
          }
          res.status(200).send(data);
        })
        .catch((err) => {
          logger.error(err.message, { stack: err.stack });
          return res.status(503).send('Service currently unavailable');
        });
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
};

router.post('/ping/**', async (req: Request, res: Response) => {
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
      const parameters: ApiConfiguration = {
        ...body,
        authType: api.authType,
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
      await proxyAPIRequest(req, res, parameters, api.pingUrl, true);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/**
 * Forward requests to actual API using the API Configuration
 */
router.all('/:name/**', async (req: Request, res: Response) => {
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
