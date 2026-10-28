import express, { Request, Response } from 'express';
import { ApiConfiguration } from '@models';
import { assertPublicUrl, ForbiddenUrlError, getToken } from '@utils/proxy';
import { AppAbility } from '@security/defineUserAbility';
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
        // A ping must not follow redirects: the target host has been checked, a redirect could point elsewhere
        maxRedirects: ping ? 0 : 35,
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
          // A ping only reports that the API answered: the upstream body is never returned
          res.status(200).send(ping ? { status } : data);
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

/**
 * Test an API configuration, as submitted from the API configuration page.
 *
 * The caller must be allowed to update the configuration: the stored credentials
 * are decrypted and merged with the submitted values, so the request would otherwise
 * let any user send the integration's client id / secret to a host of their choice.
 * The endpoint and the authentication URL must also be public hosts, so the server
 * cannot be used to reach the private network.
 */
router.post('/ping/**', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.id) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const api = await ApiConfiguration.findById(body.id).select(
      'name authType endpoint pingUrl settings permissions id'
    );
    if (!api) {
      return res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
    const ability: AppAbility = req.context.user.ability;
    if (ability.cannot('update', api)) {
      return res
        .status(403)
        .send(i18next.t('common.errors.permissionNotGranted'));
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
    /**
     * Get a setting from the request body, falling back on the stored one
     * when the body contains the placeholder shown in the UI.
     *
     * @param key setting name
     * @returns setting value
     */
    const setting = (key: keyof typeof settings): string =>
      get(body, `settings.${key}`, SETTING_PLACEHOLDER) !== SETTING_PLACEHOLDER
        ? get(body, `settings.${key}`)
        : get(settings, key);
    const parameters = {
      id: api.id,
      name: api.name,
      authType: api.authType,
      pingUrl: api.pingUrl,
      endpoint: get(body, 'endpoint') || api.endpoint,
      settings: {
        authTargetUrl: setting('authTargetUrl'),
        apiClientID: setting('apiClientID'),
        safeSecret: setting('safeSecret'),
        scope: setting('scope'),
      },
    } as ApiConfiguration;

    // Never let the server call a non-public host on behalf of the user
    try {
      await assertPublicUrl(parameters.endpoint);
      if (api.authType === authType.serviceToService) {
        await assertPublicUrl(parameters.settings.authTargetUrl);
      }
    } catch (err) {
      if (err instanceof ForbiddenUrlError) {
        logger.warn(
          `Ping of API configuration ${api.id} refused: ${err.message}`
        );
        return res.status(400).send(i18next.t('common.errors.invalidAPI'));
      }
      throw err;
    }

    req.method = 'GET';
    await proxyAPIRequest(req, res, parameters, api.pingUrl, true);
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
