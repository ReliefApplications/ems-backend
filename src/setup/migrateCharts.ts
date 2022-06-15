import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Dashboard } from '../models';
import { isArray } from 'lodash';
dotenv.config();

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
  for (const pipe of aggregation?.pipeline || []) {
    if (pipe.type === 'group' && !isArray(pipe.form.groupBy)) {
      pipe.form.groupBy = [
        {
          field: pipe.form.groupBy,
          expression: { operator: null, field: '' },
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
          updated ||= await updateWidget(widget);
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

/**
 * Initialize the database
 */
if (process.env.COSMOS_DB_PREFIX) {
  mongoose.connect(
    `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`,
    {
      useCreateIndex: true,
      useNewUrlParser: true,
      autoIndex: true,
    }
  );
} else {
  if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
      {
        useCreateIndex: true,
        useNewUrlParser: true,
        autoIndex: true,
      }
    );
  } else {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`
    );
  }
}
mongoose.connection.once('open', async () => {
  await migrateCharts();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
