import { Application, Dashboard, Step, Workflow, Page } from '@models';
import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { isArray, cloneDeep } from 'lodash';
import { contentType } from '@const/enumTypes';
import { logger } from '@lib/logger';

/** Distribution List interface */
interface DistributionList {
  widgetIndex: number;
  buttonIndex: number;
  name: string;
  emails: string[];
}

/**
 * Updates the distribution list for each of the workflow's widgets
 *
 * @param application application to update
 * @param dashboard dashboard to update
 * @param workflow workflow to update
 * @param step step to update
 */
const updateWorkflowDashboard = async (
  application: Application,
  dashboard: Dashboard,
  workflow: Workflow,
  step: Step
) => {
  try {
    const newDistributionLists: DistributionList[] = [];
    if (dashboard.structure && isArray(dashboard.structure)) {
      for (const i in dashboard.structure) {
        const widget = dashboard.structure[i];
        if (
          widget &&
          widget.component === 'grid' &&
          widget.settings?.floatingButtons?.length
        ) {
          for (const j in widget.settings.floatingButtons) {
            const button = widget.settings.floatingButtons[j];
            if (button.sendMail) {
              logger.info(
                `[${application.name} / ${workflow.name} / ${step.name}] - ${widget.settings.title}`
              );
              if (
                button.distributionList &&
                isArray(button.distributionList) &&
                button.distributionList.length > 0
              ) {
                logger.info('\tCreated distribution list for email');
                newDistributionLists.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Default Email - ${widget.settings.title} - ${workflow.name} - ${step.name}`,
                  emails: button.distributionList,
                });
              }
            }
          }
        }
      }
    }
    if (newDistributionLists.length === 0) return;
    const app = await Application.findByIdAndUpdate(
      application.id,
      {
        $push: {
          distributionLists: {
            $each: newDistributionLists.map((x) => ({
              name: x.name,
              emails: x.emails,
            })),
          },
        },
      },
      { new: true }
    );

    const addedDistributionLists =
      app?.distributionLists.slice(-newDistributionLists.length) || [];

    const widgets = cloneDeep(dashboard.structure);

    for (const list of newDistributionLists) {
      const addedId = addedDistributionLists.shift()._id;
      const btn =
        widgets[list.widgetIndex].settings.floatingButtons[list.buttonIndex];

      // removes the old props used to save email distribution lists
      delete btn.distributionList;

      // adds id of the created id to the button
      btn.distributionList = addedId;
    }

    await Dashboard.findByIdAndUpdate(dashboard.id, {
      $set: { structure: widgets },
    });
  } catch (err) {
    console.error(`skip: ${err}`);
  }
};

/**
 * Updates the distribution list for each of the dashboard's widgets
 *
 * @param dashboard dashboard to update
 * @param application application to update
 */
const updateDashboard = async (
  dashboard: Dashboard,
  application: Application
) => {
  try {
    const newDistributionLists: DistributionList[] = [];
    if (dashboard.structure && isArray(dashboard.structure)) {
      for (const i in dashboard.structure) {
        const widget = dashboard.structure[i];
        if (
          widget &&
          widget.component === 'grid' &&
          widget.settings?.floatingButtons?.length
        ) {
          for (const j in widget.settings.floatingButtons) {
            const button = widget.settings.floatingButtons[j];
            if (button.sendMail) {
              logger.info(
                `[${application.name} / ${dashboard.name}] - ${widget.settings.title}`
              );
              if (
                button.distributionList &&
                isArray(button.distributionList) &&
                button.distributionList.length > 0
              ) {
                logger.info('\tCreated distribution list for email');
                logger.info(button.distributionList);
                newDistributionLists.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Distribution List - ${widget.settings.title} - ${application.name}`,
                  emails: button.distributionList,
                });
              }
            }
          }
        }
      }
    }
    if (newDistributionLists.length === 0) return;
    const app = await Application.findByIdAndUpdate(
      application.id,
      {
        $push: {
          distributionLists: {
            $each: newDistributionLists.map((x) => ({
              name: x.name,
              emails: x.emails,
            })),
          },
        },
      },
      { new: true }
    );

    const addedDistributionLists =
      app?.distributionLists.slice(-newDistributionLists.length) || [];

    const widgets = cloneDeep(dashboard.structure);

    for (const list of newDistributionLists) {
      const addedId = addedDistributionLists.shift()._id;
      const btn =
        widgets[list.widgetIndex].settings.floatingButtons[list.buttonIndex];

      // removes the old props used to save email distribution list
      delete btn.distributionList;

      // adds id of the created id to the button
      btn.distributionLists = addedId;
    }

    await Dashboard.findByIdAndUpdate(dashboard.id, {
      $set: { structure: widgets },
    });
  } catch (err) {
    console.error(`skip: ${err}`);
  }
};

/** Migrate email distribution lists */
const migrateDistributionLists = async () => {
  const applications = await Application.find()
    .populate({
      path: 'pages',
      model: 'Page',
    })
    .select('name pages');
  for (const application of applications) {
    if (application.pages.length > 0) {
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
          await updateWorkflowDashboard(
            application,
            step.content,
            workflow,
            step
          );
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
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  await migrateDistributionLists();
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {};
