import express from 'express';
import { AppAbility } from '../../security/defineUserAbility';
import { Dashboard } from '../../models';

/**
 * Get templates for summary cards
 */
const router = express.Router();

/**
 * Get the 3 most recent summary cards
 */
router.get('/templates', async (req, res) => {
  const ability: AppAbility = req.context.user.ability;
  const abilityFilters = Dashboard.accessibleBy(ability, 'read').getFilter();
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
});

export default router;
