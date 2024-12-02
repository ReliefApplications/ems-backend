import { logger } from '@services/logger.service';
import express from 'express';
import { Request, Response } from 'express';
import xlsBuilder from '@utils/files/xlsBuilder';
import { ActivityLog } from '@models';
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
  const { userId, applicationId } = req.query;

  const query: Record<string, string> = {};
  if (userId) query.userId = userId as string;
  if (applicationId) query.applicationId = applicationId as string;

  const activities: ActivityLog[] = await ActivityLog.find(query);

  // Columns to be included in the XLSX file
  const columns = [
    { name: 'userId', title: 'User ID', field: 'userId' },
    { name: 'eventType', title: 'Event Type', field: 'eventType' },
    { name: 'metadata', title: 'metadata', field: 'metadata' },
  ];

  const formattedData = activities.map((activity) => ({
    userId: activity.userId?.toString(),
    eventType: activity.eventType,
    metadata: JSON.stringify(activity.metadata),
  }));
  console.log('formattedData', formattedData);

  const fileName = 'activities.xlsx';
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
    });
    console.log('activity', activity);
    await activity.save();
    res.status(200).send(activity);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

router.get('/download-activities', async (req, res) => {
  try {
    exportActivitiesToXlsx(req, res);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

export default router;
