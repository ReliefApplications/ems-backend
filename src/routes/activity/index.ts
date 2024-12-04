import { ActivityLog, User } from '@models';
import { logger } from '@services/logger.service';
import xlsBuilder from '@utils/files/xlsBuilder';
import config from 'config';
import express, { Request, Response } from 'express';
import { Types } from 'mongoose';

/** Express router to mount activity related functions on. */
const router = express.Router();

/**
 * Export activities to an XLSX file
 *
 * @param req Request object
 * @param res Response object
 * @returns void
 */
const exportActivitiesToXlsx = async (req: Request, res: Response) => {
  try {
    const { userId, applicationId, filter } = req.body;
    const fileName = 'activities.xlsx';

    const query: Record<string, any> = {};
    if (userId) query.userId = new Types.ObjectId(userId);
    if (applicationId) query.applicationId = new Types.ObjectId(applicationId);

    if (filter?.length) {
      filter.forEach((f) => {
        if (f.field === 'createdAt' && f.operator && f.value) {
          query.createdAt = query.createdAt || {};
          query.createdAt[`$${f.operator}`] = new Date(f.value);
        }
      });
    }

    const activities = await ActivityLog.find(query).sort({ createdAt: -1 });
    const attributes: { text: string; value: string }[] =
      config.get('user.attributes.list') || [];
    const columns = [
      { name: 'userId', title: 'User ID', field: 'userId' },
      { name: 'username', title: 'Username', field: 'username' },
      ...attributes.map((attr) => ({
        name: attr.text,
        title: attr.text,
        field: `attributes.${attr.value}`,
      })),
      { name: 'eventType', title: 'Event Type', field: 'eventType' },
      { name: 'metadata', title: 'Metadata', field: 'metadata' },
    ];

    const userIds = activities.map((activity) => activity.userId);
    const usernames = await User.find({ _id: { $in: userIds } }).select(
      'username'
    );

    const formattedData = activities.map((activity) => ({
      userId: activity.userId?.toString(),
      username: usernames.find((user) => activity.userId?.equals(user._id))
        ?.username,
      eventType: activity.eventType,
      metadata: JSON.stringify(activity.metadata),
      attributes: activity.attributes,
    }));

    const file = await xlsBuilder(fileName, columns, formattedData);

    res.attachment(fileName);
    res.send(file);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error generating file');
  }
};

/** Log new activity */
router.post('/', async (req, res) => {
  try {
    const { user, body } = req.context;
    const activity = new ActivityLog({
      userId: user._id,
      eventType: body.eventType,
      applicationId: new Types.ObjectId(body.metadata.applicationId),
      metadata: body.metadata,
      attributes: user.attributes,
    });
    await activity.save();
    res.status(200).send(activity);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error logging activity');
  }
});

/** Download activities */
router.post('/download-activities', async (req, res) => {
  await exportActivitiesToXlsx(req, res);
});

export default router;
