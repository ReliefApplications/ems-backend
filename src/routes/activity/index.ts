import { logger } from '@services/logger.service';
import express from 'express';
import { Request, Response } from 'express';
import xlsBuilder from '@utils/files/xlsBuilder';
import { ActivityLog } from '@models';

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
  const columns = ['userId', 'eventType', 'metadata'];
  // Define the file name
  const fileName = 'activities.xlsx';
  // Generate the XLSX file
  const file = await xlsBuilder(fileName, columns, activities);
  // Send the file as a response
  res.attachment(fileName);
  res.send(file);
};

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

router.get('/download-activities', async (req, res) => {
  try {
    exportActivitiesToXlsx(req, res);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send('Error');
  }
});

export default router;
