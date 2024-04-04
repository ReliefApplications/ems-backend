import { Dashboard } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  // For each dashboard, we parse the structure to add the widget ids
  const dashboards = await Dashboard.find();
  dashboards.forEach((dashboard) => {
    const structure = dashboard.structure;
    if (Array.isArray(structure)) {
      structure.forEach((widget) => {
        // First we check to see if the id is already in the expected format
        // which is "widget-<uuid>" using a regex
        if (
          !/^widget-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
            widget.id
          )
        ) {
          // If it's not, we generate a new id and assign it
          widget.id = `widget-${uuidv4()}`;
          widget.settings.id = widget.id;
        }
      });
      dashboard.markModified('structure');
    }
  });

  // Save all the dashboards
  await Dashboard.bulkSave(dashboards);
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
