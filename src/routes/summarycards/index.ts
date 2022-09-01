import express from 'express';
import { Dashboard } from '../../models';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const _ = require('lodash');

/**
 * Get templates for summary cards
 */
const router = express.Router();

/**
 * Get the 3 most recent summary cards
 */
router.get('/templates', async (req, res) => {
  //Get all  dashboards
  const dashboardsAll = await Dashboard.find();

  //Get all widgets with the name of their dashboard
  let listOfWidgets = [];
  dashboardsAll.map((elt) => {
    if (_.isArray(elt.structure)) {
      const json = elt.structure;
      json.map((elt2) => {
        Object.assign(elt2, { dashboardName: elt.name });
      });
      listOfWidgets.push(json);
    }
  });

  //Keep only summary cards
  listOfWidgets = listOfWidgets.flat().filter(function (elt) {
    if (elt.name === 'Summary card') {
      return elt;
    }
  });

  //Get all cards with the name of their dashboard
  const listOfSummaryCards = [];
  listOfWidgets.map((elt) => {
    const json = elt.settings.cards;
    json.map((elt2) =>
      Object.assign(elt2, { dashboardName: elt.dashboardName })
    );
    listOfSummaryCards.push(json);
  });

  res.send(listOfSummaryCards.flat());
});

export default router;
