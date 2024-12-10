import { ActivityLog, User } from '@models';
import { logger } from '@services/logger.service';
import xlsBuilder from '@utils/files/xlsBuilder';
import getFilter from '@utils/filter/getFilter';
import config from 'config';
import express, { Request, Response } from 'express';
import isNil from 'lodash/isNil';
import { Types } from 'mongoose';

/** Express router to mount activity related functions on. */
const router = express.Router();

/** Date format options */
const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23', // Ensures 24-hour format
};

/**
 * Format date
 *
 * @param date Date to format
 * @param timeZone User timezone
 * @returns formatted date
 */
const formatDate = (date: Date, timeZone: string) => {
  const formattedParts = new Intl.DateTimeFormat('en-GB', {
    ...dateFormatOptions,
    timeZone,
  })
    .formatToParts(date) // Breaks down the date into individual parts
    .reduce(
      (acc, part) => ({ ...acc, [part.type]: part.value }),
      {} as Record<string, string>
    );
  return `${formattedParts.year}-${formattedParts.month}-${formattedParts.day} ${formattedParts.hour}:${formattedParts.minute}`;
};

/**
 * Export activities to an XLSX file
 *
 * @param req Request object
 * @param res Response object
 * @returns void
 */
const exportActivitiesToXlsx = async (req: Request, res: Response) => {
  // Define the name of the file
  const fileName = 'activities.xlsx';
  const timeZone: string = req.body.timeZone || 'UTC';
  const { userId, applicationId, filter } = req.body;
  const filters: any[] = [
    ...(userId ? [{ userId: new Types.ObjectId(userId) }] : []),
    ...(applicationId ? [{ 'metadata.applicationId': applicationId }] : []),
  ];
  if (!isNil(filter)) {
    const queryFilters = getFilter(req.body.filter, [
      {
        name: 'createdAt',
        type: 'date',
      },
    ]);
    filters.push(queryFilters);
  }
  // Fetch activities from the database
  const activities: ActivityLog[] = await ActivityLog.find({
    $and: [...filters],
  }).sort({ createdAt: 'desc' }); // dynamic based on query sort field
  // List of user attributes
  const attributes: any[] = config.get('user.attributes.list') || [];

  // Define the columns to be included in the XLSX file
  const columns = [
    { name: 'timestamp', title: 'Timestamp', field: 'timestamp' },
    { name: 'userId', title: 'User ID', field: 'userId' },
    { name: 'username', title: 'username', field: 'username' },
    ...attributes.map((x) => {
      return {
        name: x.text,
        title: x.text,
        field: `attributes.${x.value}`,
      };
    }),
    { name: 'eventType', title: 'Event Type', field: 'eventType' },
    { name: 'title', title: 'Title', field: 'title' },
  ];

  // Get related usernames of given activities by their related userId
  const userIds = activities.map((activity) => activity.userId);
  const usernames = await User.find()
    .where({
      $and: [{ _id: { $in: userIds } }],
    })
    .select('username');
  const formattedData = activities.map((activity) => ({
    timestamp: formatDate(activity.createdAt, timeZone),
    userId: activity.userId?.toString(),
    eventType: activity.eventType,
    title: activity.metadata?.title || '',
    username: usernames.find((user) => activity.userId?.equals(user._id))
      ?.username,
    attributes: activity.attributes,
  }));

  // Build the XLSX file
  const file = await xlsBuilder(fileName, columns, formattedData);

  // Send the file as an attachment
  res.attachment(fileName);
  res.send(file);
};

/** Log new activity */
router.post('/', async (req, res) => {
  try {
    const user = req.context.user;
    const body = req.body;
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
  try {
    await exportActivitiesToXlsx(req, res);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

export default router;
