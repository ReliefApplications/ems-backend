import { ActivityLog } from '@models/activityLog.model';
import { logger } from '@services/logger.service';
import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const user = req.context.user;
    const body = req.body;
    const activity = new ActivityLog({
      userId: user.id,
      eventType: body.eventType,
      metadata: body.metadata,
    });
    await activity.save();
    res.status(200).send(activity);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

export default router;
