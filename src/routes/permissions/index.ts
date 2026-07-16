import express from 'express';
import config from 'config';
import { logger } from '@services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { ENRICHED_ATTRIBUTES } from '@utils/user/enrichUserAttributes';

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
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

/** Return available attributes */
router.get('/attributes', async (req: any, res) => {
  try {
    const configured: { value: string; text: string }[] =
      config.get('user.attributes.list') || [];
    // Login-time enriched attributes (country / region metadata) are only
    // exposed on demand, so they can be selected in access filters
    const includeEnriched = req.query.enriched === 'true';
    const data = includeEnriched
      ? [
          ...configured,
          ...ENRICHED_ATTRIBUTES.filter(
            (x) => !configured.some((y) => y.value === x.value)
          ),
        ]
      : configured;
    return res.status(200).send(data);
  } catch (err) {
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
