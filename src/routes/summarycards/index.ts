import express from 'express';
import { AppAbility } from '../../security/defineUserAbility';
import { Dashboard } from '../../models';
import get from 'lodash/get';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';

/**
 * Get templates for summary cards
 */
const router = express.Router();

/**
 * Get the 3 most recent summary cards
 */
router.get('/templates', async (req, res) => {
  try {
    const ability: AppAbility = req.context.user.ability;
    const abilityFilters = Dashboard.find(
      accessibleBy(ability, 'read').Dashboard
    ).getFilter();

    const search = get(req.query, 'search', '');

    const cards = await Dashboard.aggregate([
      {
        $match: {
          $and: [abilityFilters],
        },
      },
      {
        $unwind: '$structure',
      },
      {
        $match: {
          'structure.component': 'summaryCard',
        },
      },
      {
        $sort: { modifiedAt: -1 },
      },
      {
        $unwind: '$structure.settings.cards',
      },
      ...(search && [
        {
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              {
                'structure.settings.cards.title': {
                  $regex: search,
                  $options: 'i',
                },
              },
            ],
          },
        },
      ]),
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              {
                dashboardName: '$name',
              },
              '$structure.settings.cards',
            ],
          },
        },
      },
      {
        $limit: 3,
      },
    ]);

    res.send(cards);
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    res.status(500).send(req.t('common.errors.internalServerError'));
  }
});

export default router;
