import express from 'express';
import logger from '@lib/logger';
import { Event } from '@utils/events/event.model';
import { logEvent } from '@utils/events/logEvent';

/** Allows to send frontend events to be tracked by the analytics service */
const router = express.Router();

/**
 * Export the records of a form, or the template to upload new ones.
 * Query must contain the export format
 * Query must contain a template parameter if that is what we want to export
 */
router.post('/track', async (req, res) => {
  try {
    // get the body of the request
    const { body, context } = req;
    const user = context?.user?._id?.toString();
    if (!user) {
      return res.status(401).send('User not connected');
    }

    logEvent({
      ...body,
      user,
    } as Event);

    return res.sendStatus(200);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
