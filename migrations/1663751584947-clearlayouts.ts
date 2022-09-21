import { isArray } from 'lodash';
import { getDb } from '../migrations-utils/db';
import { Form, Resource, Dashboard } from '../src/models';

getDb();


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
    console.error(`skip: ${err}`);
  }
};

/**
 * Use to clearlayouts migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await Resource.updateMany({ $unset: { layouts: 1 } });
  await Form.updateMany({ $unset: { layouts: 1 } });
  const dashboards = await Dashboard.find();
  for (const dashboard of dashboards) {
    await updateDashboard(dashboard);
  }
};

/**
 * Use to clearlayouts migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
