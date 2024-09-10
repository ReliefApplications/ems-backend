import { get, isArray } from 'lodash';
import {
  Application,
  Dashboard,
  Page,
  Resource,
  Workflow,
} from '../src/models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '../src/lib/logger';
import { contentType } from '@const/enumTypes';

/**
 * Update dashboard grid widgets, replacing the template location and removing the query
 *
 * @param dashboard dashboard to update
 * @param application application to update
 */
const updateDashboard = async (
  dashboard: Dashboard,
  application: Application
) => {
  if (dashboard.structure && isArray(dashboard.structure)) {
    for (const widget of dashboard.structure) {
      if (widget && widget.component === 'grid') {
        const resourceId = get(widget, 'settings.resource', null);
        if (resourceId) {
          const resource = await Resource.findById(widget.settings.resource);
          if (resource) {
            const template = get(widget, 'settings.query.template', null);
            if (template) {
              widget.settings.template = template;
              delete widget.settings.query;
              await Dashboard.findByIdAndUpdate(dashboard.id, {
                structure: dashboard.structure,
              });
            } else {
              logger.info('skip: related resource / form not found');
            }
          } else {
            logger.info(
              `[${application.name} / ${dashboard.name}]: related resource / form not found.`
            );
          }
        }
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
  const applications = await Application.find()
    .populate({
      path: 'pages',
      model: 'Page',
    })
    .select('name pages');
  for (const application of applications) {
    if (application.pages.length > 0) {
      logger.info(`Updating application: ${application.name}`);
      // Update workflow dashboard steps
      const workflows = await Workflow.find({
        _id: {
          $in: application.pages
            .filter((x: Page) => x.type === contentType.workflow)
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
          await updateDashboard(step.content, application);
        }
      }

      // Update dashboard pages
      const dashboards = await Dashboard.find({
        _id: {
          $in: application.pages
            .filter((x: Page) => x.type === contentType.dashboard)
            .map((x: any) => x.content),
        },
      });
      for (const dashboard of dashboards) {
        await updateDashboard(dashboard, application);
      }
    }
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
