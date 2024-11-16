import { logger } from '@services/logger.service';
import express from 'express';
import { Request, Response } from 'express';
import xlsBuilder from '@utils/files/xlsBuilder';
import { Activity } from '@models/activity.model';

const router = express.Router();

const exportActivitiesToXlsx = async (req: Request, res: Response) => {
  // Fetch activities from the database
  const activities: Activity[] = await Activity.find();
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
    const activity = new Activity({
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
