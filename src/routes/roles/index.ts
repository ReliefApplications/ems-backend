import express from 'express';
import { Resource, Application, Channel, Role, Page, User } from '@models';
import get from 'lodash/get';
import i18next from 'i18next';
import defineUserAbility, { AppAbility } from '@security/defineUserAbility';
import extendAbilityForPage from '@security/extendAbilityForPage';

/** Routes for roles */
const router = express.Router();

/**
 * Get role summary by roleId
 */
router.get('/:id/summary', async (req, res) => {
  const roleId = get(req.params, 'id', '');

  let role: Role;

  const ability: AppAbility = req.context.user.ability;
  if (ability.can('read', 'Role')) {
    try {
      role = await Role.accessibleBy(ability, 'read')
        .findOne({
          _id: roleId,
        })
        .populate({
          path: 'permissions',
          model: 'Permission',
        });
      if (!role) {
        res.status(404).send(i18next.t('common.errors.dataNotFound'));
      }
    } catch {
      res.status(404).send(i18next.t('common.errors.dataNotFound'));
    }
  } else {
    res.status(403).send(i18next.t('common.errors.permissionNotGranted'));
  }

  const userRole = new User({ roles: [role] });
  userRole.ability = defineUserAbility(userRole);

  const fullAccessResources = await Resource.find({
    $and: [
      Resource.accessibleBy(userRole.ability, 'read').getFilter(),
      Resource.accessibleBy(userRole.ability, 'update').getFilter(),
      Resource.accessibleBy(userRole.ability, 'delete').getFilter(),
      // Resource.accessibleBy(userRole.ability, 'create').getFilter(),
    ],
  }).select('id');

  const limitedAccessResourceCount = await Resource.countDocuments({
    $and: [
      {
        $or: [
          Resource.accessibleBy(userRole.ability, 'read').getFilter(),
          Resource.accessibleBy(userRole.ability, 'update').getFilter(),
          Resource.accessibleBy(userRole.ability, 'delete').getFilter(),
          // Resource.accessibleBy(userRole.ability, 'create').getFilter(),
        ],
        _id: {
          $nin: fullAccessResources.map((x) => x.id),
        },
      },
    ],
  });

  let application: Application;
  if (role.application) {
    application = await Application.findById(role.application);
  }

  const response = {
    resources: {
      total: await Resource.count(),
      limited: limitedAccessResourceCount,
      full: fullAccessResources.length,
    },
    channels: {
      total: await Channel.count(
        application ? { application: application.id } : {}
      ),
      full: await Channel.count({
        _id: { $in: role.channels },
        ...(application && { application: application.id }),
      }),
    },
  };

  if (application) {
    const pagesAbility = await extendAbilityForPage(userRole, application);
    const filter = Page.accessibleBy(pagesAbility, 'read').getFilter();
    Object.assign(response, {
      pages: {
        full: await Page.where({
          $and: [filter, { _id: { $in: application.pages } }],
        }).count(),
        total: application.pages.length,
      },
    });
  }

  res.send(response);
});

export default router;
