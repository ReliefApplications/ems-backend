import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Dashboard, Form, Resource } from '../models';
import { isArray } from 'lodash';
dotenv.config();

const migrateLayouts = async () => {
  const dashboards = await Dashboard.find();
  for (const dashboard of dashboards) {
    try {
      if (dashboard.structure && isArray(dashboard.structure)) {
        for (const widget of dashboard.structure) {
          if (widget && widget.component === 'grid' && !widget.layouts) {
            if (widget.settings?.resource) {
              const layout = {
                name: widget.name,
                query: widget.settings?.query,
                display: widget.settings?.defaultLayout
              };
              const form = await Form.findById(widget.settings.resource);
              const resource = await Resource.findById(widget.settings.resource);
              if (form) {
                form.layouts.push(layout);
                await form.save();
                widget.layouts = [form.layouts.pop().id];
              } else {
                if (resource) {
                  resource.layouts.push(layout);
                  await resource.save();
                  widget.layouts = [resource.layouts.pop().id];
                } else {
                  console.log('skip: related resource / form not found');
                }
              }
            } else {
              console.log(widget);
              console.log('skip: no related resource / form');
            }
          }
        }
      }
    } catch (err) {
      console.error(`skip: ${err}`);
      continue;
    }
  }
}

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
  await migrateLayouts();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});