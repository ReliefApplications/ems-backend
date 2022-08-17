import mongoose from 'mongoose';
import {
  Application,
  Dashboard,
  Form,
  Resource,
  Step,
  Workflow,
} from '../models';
import { isArray, get } from 'lodash';
import { contentType } from '../const/enumTypes';
import { startDatabase } from '../server/database';

/**
 * Updates the layout for each of the dashboard's widgets
 *
 * @param dashboard Mongoose dashboard model
 * @param application Mongoose application model
 */
const updateDashboard = async (
  dashboard: Dashboard,
  application: Application
) => {
  try {
    if (dashboard.structure && isArray(dashboard.structure)) {
      for (const widget of dashboard.structure) {
        if (
          widget &&
          widget.component === 'grid' &&
          !widget.settings?.layouts &&
          widget.settings.query
        ) {
          if (widget.settings?.resource) {
            const layout = {
              name: `${dashboard.name} - ${application.name}`,
              query: widget.settings?.query,
            };
            const defaultLayout = get(widget, 'settings.defaultLayout', {});
            const adminLayout = {
              name: `Default view - ${application.name}`,
              query: widget.settings?.query,
              display:
                typeof defaultLayout === 'string'
                  ? JSON.parse(defaultLayout)
                  : defaultLayout,
            };
            const form = await Form.findById(widget.settings.resource);
            const resource = await Resource.findById(widget.settings.resource);
            if (form) {
              form.layouts.push(layout);
              form.layouts.push(adminLayout);
              await form.save();
              widget.settings.layouts = [
                form.layouts.pop().id,
                form.layouts.pop().id,
              ];
              await Dashboard.findByIdAndUpdate(dashboard.id, {
                modifiedAt: new Date(),
                structure: dashboard.structure,
              });
            } else {
              if (resource) {
                resource.layouts.push(layout);
                resource.layouts.push(adminLayout);
                // console.log(resource.id);
                await resource.save();
                widget.settings.layouts = [
                  resource.layouts.pop().id,
                  resource.layouts.pop().id,
                ];
                await Dashboard.findByIdAndUpdate(dashboard.id, {
                  modifiedAt: new Date(),
                  structure: dashboard.structure,
                });
              } else {
                console.log('skip: related resource / form not found');
              }
            }
          } else {
            console.log('skip: no related resource / form');
          }
        }
      }
    }
  } catch (err) {
    console.error(`skip: ${err}`);
  }
};

/**
 * Updates the layout for each of the workflow's widgets
 *
 * @param dashboard Mongoose dashboard model
 * @param workflow Mongoose workflow model
 * @param step Mongoose workflow step model
 */
const updateWorkflowDashboard = async (
  dashboard: Dashboard,
  workflow: Workflow,
  step: Step
) => {
  try {
    if (dashboard.structure && isArray(dashboard.structure)) {
      for (const widget of dashboard.structure) {
        if (
          widget &&
          widget.component === 'grid' &&
          !widget.settings?.layouts &&
          widget.settings.query
        ) {
          // console.log(`${workflow.name} - ${step.name}`);
          if (widget.settings?.resource) {
            const defaultLayout = get(widget, 'settings.defaultLayout', {});
            const adminLayout = {
              name: `${workflow.name} - ${step.name}`,
              query: widget.settings?.query,
              display:
                typeof defaultLayout === 'string'
                  ? JSON.parse(defaultLayout)
                  : defaultLayout,
            };
            const form = await Form.findById(widget.settings.resource);
            const resource = await Resource.findById(widget.settings.resource);
            if (form) {
              form.layouts.push(adminLayout);
              await form.save();
              widget.settings.layouts = [form.layouts.pop().id];
              await Dashboard.findByIdAndUpdate(dashboard.id, {
                modifiedAt: new Date(),
                structure: dashboard.structure,
              });
            } else {
              if (resource) {
                resource.layouts.push(adminLayout);
                // console.log(resource.id);
                await resource.save();
                widget.settings.layouts = [resource.layouts.pop().id];
                await Dashboard.findByIdAndUpdate(dashboard.id, {
                  modifiedAt: new Date(),
                  structure: dashboard.structure,
                });
              } else {
                // console.log('skip: related resource / form not found');
              }
            }
          } else {
            // console.log('skip: no related resource / form');
          }
        }
      }
    }
  } catch (err) {
    // console.error(`skip: ${err}`);
  }
};

/** Migrate worflows and dashboard layouts */
const migrateLayouts = async () => {
  const applications = await Application.find()
    .populate({
      path: 'pages',
      model: 'Page',
    })
    .select('name pages');
  for (const application of applications) {
    if (application.pages.length > 0) {
      console.log(`Updating application: ${application.name}`);
      // Update workflow dashboard steps
      const workflows = await Workflow.find({
        _id: {
          $in: application.pages
            .filter((x) => x.type === contentType.workflow)
            .map((x: any) => x.content),
        },
      }).populate({
        path: 'steps',
        model: 'Step',
        populate: {
          path: 'content',
          model: 'Dashboard',
        },
      });
      for (const workflow of workflows) {
        for (const step of workflow.steps.filter(
          (x) => x.type === contentType.dashboard
        )) {
          await updateWorkflowDashboard(step.content, workflow, step);
        }
      }

      // Update dashboard pages
      const dashboards = await Dashboard.find({
        _id: {
          $in: application.pages
            .filter((x) => x.type === contentType.dashboard)
            .map((x: any) => x.content),
        },
      });
      for (const dashboard of dashboards) {
        await updateDashboard(dashboard, application);
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
// Once connected, update layouts
mongoose.connection.once('open', async () => {
  await migrateLayouts();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
