import express from 'express';
import config from 'config';
import { logger } from '@lib/logger';

/**
 * Routes for permissions
 */
const router = express.Router();

/** Return configuration of permissions */
router.get('/configuration', async (req: any, res) => {
  try {
    const data = {
      groups: {
        local: config.get('user.groups.local'),
      },
      attributes: {
        local: config.get('user.attributes.local'),
      },
    };
    return res.status(200).send(data);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/** Return available attributes */
router.get('/attributes', async (req: any, res) => {
  try {
    const data = config.get('user.attributes.list') || [];
    return res.status(200).send(data);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
