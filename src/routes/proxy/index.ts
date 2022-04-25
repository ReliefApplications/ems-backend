import express from 'express';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { ApiConfiguration } from '../../models';
import { getToken } from '../../utils/proxy';
import { isEmpty } from 'lodash';
import i18next from 'i18next';

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
    res.status(404).send(errors.dataNotFound);
  }
  const token = await getToken(apiConfiguration);
  const headers = Object.assign(req.headers, {
    authorization: `Bearer ${token}`,
  });
  const endpoint = req.originalUrl.split(req.params.name).pop().substring(1);
  const url = new URL(apiConfiguration.endpoint + endpoint);
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
      res.writeHead(forwardRes.statusCode, forwardRes.headers);
      forwardRes.pipe(res, { end: true });
    }).on('error', () => {
      res.writeHead(503, {
        'Content-Type': 'text/plain',
      });
      res.write('Service currently unvailable');
      return res.end();
    });
    req.pipe(forwardReq, { end: true });
    if (!isEmpty(req.body)) {
      forwardReq.write(JSON.stringify(req.body));
    }
    req.resume();
  } catch (e) {
    try {
      res.status(503).send('Service currently unvailable');
    } catch (_e) {
      res.status(500).send(i18next.t('errors.invalidAPI'));
    }
  }
});

export default router;
