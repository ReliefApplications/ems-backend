import express from 'express';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ApiConfiguration } from '@models';
import { getToken } from '@utils/proxy';
import { isEmpty } from 'lodash';
import i18next from 'i18next';

/** Express router */
const router = express.Router();

/**
 * Forward requests to actual API using the API Configuration
 */
router.all('/:name/**', async (req, res) => {
  req.pause();
  const apiConfiguration = await ApiConfiguration.findOne({
    $or: [{ name: req.params.name }, { id: req.params.name }],
    status: 'active',
  }).select('name authType endpoint settings id');
  if (!apiConfiguration) {
    res.status(404).send(i18next.t('common.errors.dataNotFound'));
  }
  const token = await getToken(apiConfiguration);
  const headers = Object.assign(req.headers, {
    authorization: `Bearer ${token}`,
  });
  const endpoint = req.originalUrl.split(req.params.name).pop().substring(1);
  // Add / between endpoint and path, and ensure that double slash are removed
  const url = new URL(
    `${apiConfiguration.endpoint.replace(/\$/, '')}/${endpoint}`.replace(
      /([^:]\/)\/+/g,
      '$1'
    )
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
});

export default router;
