import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { Application, Dashboard, Page, Workflow } from '@models';
import { get, isArray } from 'lodash';
import { logger } from '@lib/logger';
import { contentType } from '@const/enumTypes';

/**
 * Update dashboard grid widgets, rebuilding the modifications array
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
        const buttons = get(widget, 'settings.floatingButtons', []);
        let updateNeeded = false;
        for (const button of buttons) {
          const modifications = get(button, 'modifications', []) || [];
          if (modifications) {
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            modifications.forEach((modification: any) => {
              const field = get(modification, 'field');
              if (field && typeof modification.field !== 'string') {
                modification.field = field.name;
                updateNeeded = true;
              }
            });
          }
        }
        if (updateNeeded) {
          await Dashboard.findByIdAndUpdate(dashboard.id, {
            structure: dashboard.structure,
          });
        }

        logger.info(
          `[${application.name} / ${dashboard.name}]: updated auto-modify actions.`
        );
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
