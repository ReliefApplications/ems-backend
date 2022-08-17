import express from 'express';
import config from 'config';

/**
 * Routes for permissions
 */
const router = express.Router();

/** Return configuration of permissions */
router.get('/configuration', async (req: any, res) => {
  const data = {
    manualCreation: config.get('groups.manualCreation'),
  };
  return res.status(200).send(data);
});

export default router;
