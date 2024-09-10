import mongoose from 'mongoose';
import { Dashboard, Form, Resource } from '@models';
import { isArray } from 'lodash';
import { startDatabase } from '../server/database';
import logger from '@lib/logger';

/**
 * Remove layouts in dashboard
 *
 * @param dashboard dashboard to remove layouts in
 */
const updateDashboard = async (dashboard: Dashboard) => {
  try {
    let updateRequired = false;
    if (dashboard.structure && isArray(dashboard.structure)) {
      for (const widget of dashboard.structure) {
        if (widget && widget.component === 'grid' && widget.settings?.layouts) {
          widget.settings.layouts = undefined;
          updateRequired = true;
        }
      }
    }
    if (updateRequired) {
      await Dashboard.findByIdAndUpdate(dashboard.id, {
        modifiedAt: new Date(),
        structure: dashboard.structure,
      });
    }
  } catch (err) {
    logger.error(`skip: ${err}`);
  }
};

/**
 * Remove layouts from all forms / resources / dashboards
 */
const clearLayouts = async () => {
  await Resource.updateMany({ $unset: { layouts: 1 } });
  await Form.updateMany({ $unset: { layouts: 1 } });
  const dashboards = await Dashboard.find();
  for (const dashboard of dashboards) {
    await updateDashboard(dashboard);
  }
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
// Once connected, clear layouts
mongoose.connection.once('open', async () => {
  await clearLayouts();
  await mongoose.connection.close();
  logger.info('connection closed');
});
