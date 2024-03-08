import { v4 as uuidv4 } from 'uuid';
import { Dashboard, Page } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { isEqual } from 'lodash';

/** Updates the ids of each dashboard widget */
export const up = async () => {
  await startDatabaseForMigration();

  const pages = await Page.find({
    type: 'dashboard',
  })
    .populate({
      path: 'content',
      model: 'Dashboard',
    })
    .populate({
      path: 'contentWithContext.content',
      model: 'Dashboard',
    });

  const dashboardsToSave: Dashboard[] = [];
  pages.forEach((page) => {
    // Updates the ids on the content
    const mainDashboard = page.content as Dashboard;
    mainDashboard.structure.forEach((widget) => {
      widget.id = `widget-${uuidv4()}`;
    });
    mainDashboard.markModified('structure');
    dashboardsToSave.push(mainDashboard);

    // For each of the templates, try to match the widgets
    // in the main dashboard by the structure settings
    page.contentWithContext.forEach((cc) => {
      const templateDashboard = cc.content as Dashboard;
      templateDashboard.structure.forEach((widget) => {
        const mainDashboardWidget = mainDashboard.structure.find((w) =>
          isEqual(w.settings, widget.settings)
        );
        if (mainDashboardWidget) {
          widget.id = mainDashboardWidget.id;
        } else {
          widget.id = `widget-${uuidv4()}`;
        }
      });
      templateDashboard.markModified('structure');
      dashboardsToSave.push(templateDashboard);
    });
  });

  // Save all dashboards
  await Dashboard.bulkSave(dashboardsToSave);
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
