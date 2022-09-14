import express from 'express';
import { Resource, Application, Channel, Role, Page } from '../../models';
import get from 'lodash/get';

const router = express.Router();

/**
 * Get role summary by roleId
 */
router.get('/:roleId/summary', async (req, res) => {
  const roleId = get(req.params, 'roleId', '');

  const role = await Role.findById(roleId);

  let applicationList: Application[] = await Application.find({
    'permissions.canSee': roleId,
  });

  const totalPages = applicationList.reduce(
    (count, current) => count + current.pages.length,
    0
  );

  applicationList = applicationList.map((x) => x._id);

  const response = {
    resource: { total: await Resource.count(), limited: 0, full: 0 },
    channels: {
      total: await Channel.count({ application: { $in: applicationList } }),
      full: await Channel.count({
        _id: { $in: role.channels },
        application: { $in: applicationList },
      }),
    },
    pages: {
      total: totalPages,
      full: await Page.count({ 'permissions.canSee': roleId }),
    },
  };

  res.send(response);
});

export default router;
