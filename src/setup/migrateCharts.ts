import mongoose from 'mongoose';
import { Dashboard } from '../models';
import { isArray, get } from 'lodash';
import { startDatabase } from '../server/database';

/**
 * Update a chart widget. Function by edge effect
 *
 * @param widget The widget to update
 * @returns A boolean, indicating if the widget has been updated
 */
const updateWidget = async (widget: any): Promise<boolean> => {
  let updated = false;
  const aggregation = widget.settings?.chart?.aggregation;
  // update the groupBy field to a list of fields
  for (const stage of aggregation?.pipeline || []) {
    if (stage.type === 'group' && !isArray(stage.form.groupBy)) {
      console.log(stage.form);
      stage.form.groupBy = [
        {
          field: stage.form.groupBy,
          expression: {
            operator: get(stage, 'form.groupByExpression.operator', null),
            field: '',
          },
        },
      ];
      updated = true;
    }
  }
  // update xAxis and yAxis to category and field
  if (aggregation?.mapping.xAxis) {
    aggregation.mapping = {
      category: aggregation.mapping.xAxis,
      field: aggregation.mapping.yAxis,
    };
    updated = true;
  }
  return updated;
};

/**
 * Migrate charts for series
 */
const migrateCharts = async () => {
  const dashboards = await Dashboard.find().select('id structure');
  for (const dashboard of dashboards) {
    if (isArray(dashboard.structure)) {
      let updated = false;
      for (const widget of dashboard.structure) {
        if (widget.component === 'chart') {
          if (await updateWidget(widget)) {
            updated = true;
          }
        }
      }
      if (updated) {
        await Dashboard.findByIdAndUpdate(dashboard.id, {
          modifiedAt: new Date(),
          structure: dashboard.structure,
        });
        console.log(`Dashboard ${dashboard.id} updated.`);
      }
    }
  }
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
// Once connected, update charts
mongoose.connection.once('open', async () => {
  await migrateCharts();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
