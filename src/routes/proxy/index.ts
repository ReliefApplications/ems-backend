import express from 'express';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ApiConfiguration } from '@models';
import { getToken } from '@utils/proxy';
import { isEmpty } from 'lodash';
import i18next from 'i18next';
import config from 'config';
import * as CryptoJS from 'crypto-js';

/** Express router */
const router = express.Router();

/**
 * Takes the Api Configuration and forward the request to the actual API
 *
 * @param {*} req request object
 * @param {*} res response object
 * @param {*} apiConfiguration api configuration
 * @param {*} pingUrl ping extension url
 */
const handleAPIRequest = async (req, res, apiConfiguration, pingUrl) => {
  req.pause();

  const token = await getToken(apiConfiguration);
  const headers = Object.assign(req.headers, {
    authorization: `Bearer ${token}`,
  });

  const endpoint = apiConfiguration.endpoint;
  // Add / between endpoint and path, and ensure that double slash are removed
  const url = new URL(
    `${endpoint.replace(/\$/, '')}/${pingUrl}`.replace(/([^:]\/)\/+/g, '$1')
  );
  headers.host = url.hostname;
  const protocol = apiConfiguration.endpoint.startsWith('https')
    ? 'https:'
    : 'http:';
  const options: any = {
    protocol,
    host: url.hostname,
    path: url.pathname,
    method: req.method,
    headers: headers,
    agent: false,
  };
  const request = protocol === 'https:' ? httpsRequest : httpRequest;
  try {
    const forwardReq = request(options, (forwardRes) => {
      forwardRes.pause();
      forwardRes.headers['access-control-allow-origin'] = '*';
      // Check the status and throw error if it's not any of the following
      switch (forwardRes.statusCode) {
        case 200:
        case 201:
        case 202:
        case 203:
        case 204:
        case 205:
        case 206:
        case 304:
        case 400:
        case 401:
        case 402:
        case 403:
        case 404:
        case 405:
        case 406:
        case 407:
        case 408:
        case 409:
        case 410:
        case 411:
        case 412:
        case 413:
        case 414:
        case 415:
        case 416:
        case 417:
        case 418:
          res.writeHead(forwardRes.statusCode, forwardRes.headers);
          forwardRes.pipe(res, { end: true });
          forwardRes.resume();
          break;

        default:
          const stringifiedHeaders = JSON.stringify(
            forwardRes.headers,
            null,
            4
          );
          forwardRes.resume();
          res.writeHead(500, {
            'content-type': 'text/plain',
          });
          res.end(
            process.argv.join(' ') +
              ':\n\nError ' +
              forwardRes.statusCode +
              '\n' +
              stringifiedHeaders
          );
          break;
      }
    }).on('error', () => {
      res.writeHead(503, {
        'Content-Type': 'text/plain',
      });
      res.write('Service currently unavailable');
      return res.end();
    });
    req.pipe(forwardReq, { end: true });
    if (!isEmpty(req.body)) {
      forwardReq.write(JSON.stringify(req.body));
    }
    req.resume();
  } catch (e) {
    try {
      res.status(503).send('Service currently unavailable');
    } catch (_e) {
      res.status(500).send(i18next.t('common.errors.invalidAPI'));
    }
  }
};

/**
 * Gets the API Configuration not saved, but sended in the body of the POST request
 *
 * @param {*} req request object
 * @param {*} res response object
 */
router.post('/', async (req, res) => {
  const apiBody = req.body;
  const apiConfiguration = await ApiConfiguration.findOne({
    $or: [{ name: apiBody.oldName }, { id: apiBody.oldName }],
  }).select('name authType endpoint settings id');
  if (!apiConfiguration) {
    res.status(404).send(i18next.t('common.errors.dataNotFound'));
  }

  apiConfiguration.authType = apiBody.authType;
  apiConfiguration.endpoint = apiBody.endpoint;
  apiConfiguration.settings = CryptoJS.AES.encrypt(
    JSON.stringify(apiBody.settings),
    config.get('encryption.key')
  ).toString();

  const endpoint = apiBody.pingUrl;
  handleAPIRequest(req, res, apiConfiguration, endpoint);
});

/**
 * Gets an previously saved API Configuration
 *
 * @param {*} req request object
 * @param {*} res response object
 */
router.get('/:name/**', async (req, res) => {
  const apiConfiguration = await ApiConfiguration.findOne({
    $or: [{ name: req.params.name }, { id: req.params.name }],
    status: 'active',
  }).select('name authType endpoint settings id');
  if (!apiConfiguration) {
    res.status(404).send(i18next.t('common.errors.dataNotFound'));
  }
  const endpoint = req.originalUrl.split(req.params.name).pop().substring(1);
  handleAPIRequest(req, res, apiConfiguration, endpoint);
});

export default router;
