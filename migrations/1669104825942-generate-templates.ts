import { Application, Dashboard, Step, Workflow, Page } from '@models';
import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { isArray, cloneDeep } from 'lodash';
import { contentType } from '@const/enumTypes';
import { logger } from '@lib/logger';

/** Template interface */
interface Template {
  widgetIndex: number;
  buttonIndex: number;
  name: string;
  subject: string;
  body: string;
}

/**
 * Updates the templates for each of the workflow's widgets
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
    const newTemplates: Template[] = [];
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
              if (button.bodyText) {
                logger.info('\tCreated template for default email');
                newTemplates.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Default Email - ${widget.settings.title} - ${workflow.name} - ${step.name}`,
                  subject: button.subject,
                  body: button.bodyText,
                });
              }
              if (button.bodyTextAlternate) {
                logger.info('\tCreated template for empty email');
                newTemplates.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Empty Email - ${widget.settings.title} - ${workflow.name} - ${step.name}`,
                  subject: button.subject,
                  body: button.bodyTextAlternate,
                });
              }
            }
          }
        }
      }
    }
    if (newTemplates.length === 0) return;
    const app = await Application.findByIdAndUpdate(
      application.id,
      {
        $push: {
          templates: {
            $each: newTemplates.map((x) => ({
              name: x.name,
              type: 'email',
              content: {
                subject: x.subject,
                body: x.body,
              },
            })),
          },
        },
      },
      { new: true }
    );

    const addedTemplates = app?.templates.slice(-newTemplates.length) || [];

    const widgets = cloneDeep(dashboard.structure);

    for (const template of newTemplates) {
      const addedId = addedTemplates.shift()._id;
      const btn =
        widgets[template.widgetIndex].settings.floatingButtons[
          template.buttonIndex
        ];

      // removes the old props used to save email templates
      delete btn.bodyText;
      delete btn.bodyTextAlternate;
      delete btn.subject;

      // adds id of the created id to the button
      btn.templates = isArray(btn.templates)
        ? btn.templates.concat(addedId)
        : [addedId];
    }

    await Dashboard.findByIdAndUpdate(dashboard.id, {
      $set: { structure: widgets },
    });
  } catch (err) {
    console.error(`skip: ${err}`);
  }
};

/**
 * Updates the templates for each of the dashboard's widgets
 *
 * @param dashboard dashboard to update
 * @param application application to update
 */
const updateDashboard = async (
  dashboard: Dashboard,
  application: Application
) => {
  try {
    const newTemplates: Template[] = [];
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
              if (button.bodyText) {
                logger.info('\tCreated template for default email');
                newTemplates.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Default Email - ${widget.settings.title} - ${application.name}`,
                  subject: button.subject,
                  body: button.bodyText,
                });
              }
              if (button.bodyTextAlternate) {
                logger.info('\tCreated template for empty email');
                newTemplates.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Empty Email - ${widget.settings.title} - ${application.name}`,
                  subject: button.subject,
                  body: button.bodyTextAlternate,
                });
              }
            }
          }
        }
      }
    }
    if (newTemplates.length === 0) return;
    const app = await Application.findByIdAndUpdate(
      application.id,
      {
        $push: {
          templates: {
            $each: newTemplates.map((x) => ({
              name: x.name,
              type: 'email',
              content: {
                subject: x.subject,
                body: x.body,
              },
            })),
          },
        },
      },
      { new: true }
    );

    const addedTemplates = app?.templates.slice(-newTemplates.length) || [];

    const widgets = cloneDeep(dashboard.structure);

    for (const template of newTemplates) {
      const addedId = addedTemplates.shift()._id;
      const btn =
        widgets[template.widgetIndex].settings.floatingButtons[
          template.buttonIndex
        ];

      // removes the old props used to save email templates
      delete btn.bodyText;
      delete btn.bodyTextAlternate;
      delete btn.subject;

      // adds id of the created id to the button
      btn.templates = isArray(btn.templates)
        ? btn.templates.concat(addedId)
        : [addedId];
    }

    await Dashboard.findByIdAndUpdate(dashboard.id, {
      $set: { structure: widgets },
    });
  } catch (err) {
    console.error(`skip: ${err}`);
  }
};

/** Migrate email templates */
const migrateTemplates = async () => {
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
  await migrateTemplates();
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {};
