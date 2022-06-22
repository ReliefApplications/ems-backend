import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Dashboard, Form, Resource } from '../models';
import { isArray } from 'lodash';
dotenv.config();

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

const clearLayouts = async () => {
  await Resource.updateMany({ $unset: { layouts: 1 } });
  await Form.updateMany({ $unset: { layouts: 1 } });
  const dashboards = await Dashboard.find();
  for (const dashboard of dashboards) {
    await updateDashboard(dashboard);
  }
};

/**
 * Initialize the database
 */
// eslint-disable-next-line no-undef
if (process.env.COSMOS_DB_PREFIX) {
  mongoose.connect(
    `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`,
    {
      useCreateIndex: true,
      useNewUrlParser: true,
      autoIndex: true,
      autoReconnect: true,
      reconnectInterval: 1000,
      reconnectTries: 3,
      poolSize: 10,
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
        autoReconnect: true,
        reconnectInterval: 1000,
        reconnectTries: 3,
        poolSize: 10,
      }
    );
  } else {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`
    );
  }
}
mongoose.connection.once('open', async () => {
  await clearLayouts();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
