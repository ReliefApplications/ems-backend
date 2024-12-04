import { ActivityLog, User } from '@models';
import { logger } from '@services/logger.service';
import xlsBuilder from '@utils/files/xlsBuilder';
import config from 'config';
import express, { Request, Response } from 'express';
import isNil from 'lodash/isNil';
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
  const { userId, applicationId, filter } = req.body;

  console.log('req.body', req.body);
  console.log('userId', userId, 'applicationId', applicationId);

  // Define the name of the file
  const fileName = 'activities.xlsx';

  // Construct query conditions
  const query: Record<string, any> = {};

  // Add userId and applicationId to the query
  if (userId) query.userId = new Types.ObjectId(userId as string);
  if (applicationId)
    query.applicationId = new Types.ObjectId(applicationId as string);

  // Process date filters
  if (filter && Array.isArray(filter)) {
    filter.forEach((f) => {
      if (f.field === 'createdAt' && f.operator && f.value) {
        if (!query.createdAt) query.createdAt = {};
        query.createdAt[`$${f.operator}`] = new Date(f.value);
      }
    });
  }

  console.log('Final Query:', query);

  // Fetch activities
  const activities: ActivityLog[] = await ActivityLog.find(query).sort({
    createdAt: 'desc',
  });

  // List of user attributes
  const attributes: any[] = config.get('user.attributes.list') || [];

  // Columns to be included in the XLSX file
  const columns = [
    { name: 'userId', title: 'User ID', field: 'userId' },
    { name: 'username', title: 'Username', field: 'username' },
    ...attributes.map((x) => ({
      name: x.text,
      title: x.text,
      field: `attributes.${x.value}`,
    })),
    { name: 'eventType', title: 'Event Type', field: 'eventType' },
    { name: 'metadata', title: 'Metadata', field: 'metadata' },
  ];

  // Get related usernames of given activities by their related userId
  const userIds = activities.map((activity) => activity.userId);
  const usernames = await User.find()
    .where({
      _id: { $in: userIds },
    })
    .select('username');

  const formattedData = activities.map((activity) => ({
    userId: activity.userId?.toString(),
    eventType: activity.eventType,
    metadata: JSON.stringify(activity.metadata),
    username: usernames.find((user) => activity.userId?.equals(user._id))
      ?.username,
    attributes: activity.attributes,
  }));

  // Build the XLSX file
  const file = await xlsBuilder(fileName, columns, formattedData);

  res.attachment(fileName);
  res.send(file);
};

router.post('/', async (req, res) => {
  try {
    const user = req.context.user;
    const body = req.body;
    const activity = new ActivityLog({
      userId: user._id,
      eventType: body.eventType,
      applicationId:
        body.metadata.applicationId ??
        new Types.ObjectId(body.metadata.applicationId),
      metadata: body.metadata,
      attributes: req.context.user.attributes,
    });
    console.log('activity', activity);
    await activity.save();
    res.status(200).send(activity);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

router.post('/download-activities', async (req, res) => {
  try {
    exportActivitiesToXlsx(req, res);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

export default router;
