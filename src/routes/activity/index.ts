import { ActivityLog, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import xlsBuilder from '@utils/files/xlsBuilder';
import getFilter from '@utils/filter/getFilter';
import config from 'config';
import express, { Request, Response } from 'express';
import isNil from 'lodash/isNil';
import { accessibleBy } from '@casl/mongoose';

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
  const ability: AppAbility = req.context.user.ability;
  // Define the name of the file
  const fileName = 'activities.xlsx';
  const filters: any[] = [];
  if (!isNil(req.body.filter)) {
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
    { name: 'metadata', title: 'metadata', field: 'metadata' },
  ];

  // Get related usernames of given activities by their related userId
  const userIds = activities.map((activity) => activity.userId);
  const usernames = await User.find(accessibleBy(ability, 'read').User)
    .where({
      $and: [{ _id: { $in: userIds } }],
    })
    .select('username');
  const formattedData = activities
    .filter(
      (activity) =>
        isNil(activity.userId) ||
        usernames.find((u) => u._id === activity.userId)
    )
    .map((activity) => ({
      userId: activity.userId?.toString(),
      eventType: activity.eventType,
      metadata: JSON.stringify(activity.metadata),
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

router.post('/', async (req, res) => {
  try {
    const user = req.context.user;
    const body = req.body;
    const activity = new ActivityLog({
      userId: user._id,
      eventType: body.eventType,
      metadata: body.metadata,
      attributes: req.context.user.attributes,
    });
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
