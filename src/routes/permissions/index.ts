import express from 'express';
import config from 'config';

/**
 * Routes for permissions
 */
const router = express.Router();

/** Return configuration of permissions */
router.get('/configuration', async (req: any, res) => {
  const data = {
    groups: {
      local: config.get('user.groups.local'),
    },
    attributes: {
      local: config.get('user.attributes.local'),
    },
  };
  return res.status(200).send(data);
});

/** Return available attributes */
router.get('/attributes', async (req: any, res) => {
  const data = config.get('user.attributes.list') || [];
  return res.status(200).send(data);
});

export default router;
