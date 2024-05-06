import express from 'express';
import config from 'config';
import { logger } from '@services/logger.service';

/** Routes for schema. */
const router = express.Router();

/** Return complete GraphQL schema URL public endpoint */
router.get('/url', async (req: any, res) => {
  try {
    // Current timestamp
    const timestamp = Date.now();
    const storageEndpoint = config.get('public.fileName');
    const schemaUrl = `${storageEndpoint}/introspection/schema?${timestamp}`;
    return res.status(200).send({ url: schemaUrl });
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
