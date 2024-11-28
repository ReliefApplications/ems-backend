import { ActivityLog, User } from '@models';
import { logger } from '@services/logger.service';
import xlsBuilder from '@utils/files/xlsBuilder';
import express, { Request, Response } from 'express';

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
  // Fetch activities from the database
  const activities: ActivityLog[] = await ActivityLog.find();

  // Define the columns to be included in the XLSX file
  const columns = [
    { name: 'userId', title: 'User ID', field: 'userId' },
    { name: 'eventType', title: 'Event Type', field: 'eventType' },
    { name: 'metadata', title: 'metadata', field: 'metadata' },
    { name: 'username', title: 'username', field: 'username' },
  ];

  // Get related usernames of given activities by their related userId
  const userIds = activities.map((activity) => activity.userId);
  const usernames = await User.find()
    .where({
      $and: [{ _id: { $in: userIds } }],
    })
    .select('username');
  const formattedData = activities.map((activity) => ({
    userId: activity.userId?.toString(),
    eventType: activity.eventType,
    metadata: JSON.stringify(activity.metadata),
    username: usernames.find((user) => activity.userId?.equals(user._id))
      ?.username,
  }));
  console.log('formattedData', formattedData);

  // Define the name of the file
  const fileName = 'activities.xlsx';

  // Build the XLSX file
  const file = await xlsBuilder(fileName, columns, formattedData);

  // Send the file as an attachment
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
      metadata: body.metadata,
    });
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
