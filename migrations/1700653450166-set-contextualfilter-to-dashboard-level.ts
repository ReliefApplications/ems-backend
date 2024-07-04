import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { Application, Dashboard, Page, Workflow } from '@models';
import { logger } from '@services/logger.service';
import { contentType } from '@const/enumTypes';

/**
 * Update dashboard if there is a contextual filter in application level, update it to dashboard level.
 *
 * @param dashboard dashboard to update
 * @param application application to update
 */
const updateDashboard = async (
  dashboard: Dashboard,
  application: Application
) => {
  // Only edit dashboards where the filter is unset, to avoid erasing data
  if (!dashboard.filter && dashboard.showFilter) {
    await Dashboard.findByIdAndUpdate(dashboard.id, {
      filter: {
        show: true,
        closable: false,
        keepPrevious: true,
        structure: application.contextualFilter,
        position: application.contextualFilterPosition,
        variant: 'default',
      },
    });

    logger.info(
      `[${application.name} / ${dashboard.name}]: updated filter of application level to dashboard level.`
    );
  } else {
    return;
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
    .select('name pages contextualFilter contextualFilterPosition');
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
