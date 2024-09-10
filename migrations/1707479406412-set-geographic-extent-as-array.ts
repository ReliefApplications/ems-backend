import { Dashboard } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { get, isArray, set } from 'lodash';
import { logger } from '@lib/logger';

/**
 * Update dashboard, by changing geographic extent of map widgets as arrays
 *
 * @param dashboard dashboard to update
 */
const updateDashboard = async (dashboard: Dashboard) => {
  if (dashboard.structure && isArray(dashboard.structure)) {
    for (const widget of dashboard.structure) {
      if (widget && widget.component === 'map') {
        const geographicExtent = get(widget, 'settings.geographicExtent', null);
        const geographicExtentValue = get(
          widget,
          'settings.geographicExtentValue',
          null
        );
        let updateNeeded = false;
        if (geographicExtent && geographicExtentValue) {
          set(widget, 'settings.geographicExtents', [
            {
              value: geographicExtentValue,
              extent: geographicExtent,
            },
          ]);
          updateNeeded = true;
        }
        if (updateNeeded) {
          await Dashboard.findByIdAndUpdate(dashboard.id, {
            structure: dashboard.structure,
          });
        }

        logger.info(`[${dashboard.name}]: updated geographic extents.`);
      }
    }
  }
};

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  // Update dashboard pages
  const dashboards = await Dashboard.find().select('name structure');
  for (const dashboard of dashboards) {
    await updateDashboard(dashboard);
  }
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
