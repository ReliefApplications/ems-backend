import express from 'express';
import { Resource, Application, Channel, Role, Page } from '../../models';
import get from 'lodash/get';
import i18next from 'i18next';
import { AppAbility } from '../../security/defineUserAbility';
import extendAbilityForPage from '../../security/extendAbilityForPage';

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
      role = await Role.accessibleBy(ability, 'read').findOne({
        _id: roleId,
      });
      if (!role) {
        res.status(404).send(i18next.t('errors.dataNotFound'));
      }
    } catch {
      res.status(404).send(i18next.t('errors.dataNotFound'));
    }
  } else {
    res.status(403).send(i18next.t('errors.permissionNotGranted'));
  }

  let application: Application;

  if (role.application) {
    application = await Application.findById(role.application);
  }

  const limitedResourceCount = await Resource.count({
    'permissions.canSeeRecords': { $elemMatch: { role: roleId } },
    'permissions.canCreateRecords': { $elemMatch: { role: roleId } },
    'permissions.canUpdateRecords': { $elemMatch: { role: roleId } },
    'permissions.canDeleteRecords': { $elemMatch: { role: roleId } },
  });

  const fullResourceCount = await Resource.count({
    $or: [
      { 'permissions.canSeeRecords': { $elemMatch: { role: roleId } } },
      { 'permissions.canCreateRecords': { $elemMatch: { role: roleId } } },
      { 'permissions.canUpdateRecords': { $elemMatch: { role: roleId } } },
      { 'permissions.canDeleteRecords': { $elemMatch: { role: roleId } } },
    ],
  });

  const pagesAbility = await extendAbilityForPage(
    req.context.user,
    application
  );
  const filter = Page.accessibleBy(pagesAbility, 'read').getFilter();

  const response = {
    resources: {
      total: await Resource.count(),
      limited: limitedResourceCount,
      full: fullResourceCount,
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
    ...(application && {
      pages: {
        full: await Page.where({
          $and: [filter, { _id: { $in: application.pages } }],
        }).count(),
        total: application.pages.length,
      },
    }),
  };

  res.send(response);
});

export default router;
