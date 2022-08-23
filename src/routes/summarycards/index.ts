import express from 'express';
import { Dashboard } from '../../models';

/**
 * Get templates for summary cards
 */
const router = express.Router();

/**
 * Get the 3 most recent summary cards
 */
router.get('/templates', async (req, res) => {
  //get all  dashboards
  const dashboardsAll = await Dashboard.find();
  let dashboardsStructure = [];
  //get all widgets that are in all dashboards
  dashboardsAll.map((elt) => dashboardsStructure.push(elt.structure));
  //remove dashboards with no widget
  dashboardsStructure = dashboardsStructure.flat().filter(function (elt) {
    return elt != null;
  });
  //keep only summary cards widgets
  dashboardsStructure = dashboardsStructure.flat().filter(function (elt) {
    if (elt.name === 'Summary card') {
      return elt;
    }
  });
  //keep the 3 last created cards
  const dashboardsCards = [];
  dashboardsStructure.map((elt) => dashboardsCards.push(elt.settings.cards));
  res.send(dashboardsCards.flat().slice(-3).reverse());
});

export default router;
