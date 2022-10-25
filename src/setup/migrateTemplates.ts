import mongoose from 'mongoose';
import { Application, Dashboard } from '../models';
import { isArray, cloneDeep } from 'lodash';
import { contentType } from '../const/enumTypes';
import { startDatabase } from '../server/database';

/** Template interface */
interface Template {
  widgetIndex: number;
  buttonIndex: number;
  name: string;
  subject: string;
  body: string;
}

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
              console.log(
                `[${application.name} / ${dashboard.name}] - ${widget.settings.title}`
              );
              if (button.bodyText) {
                console.log('\tCreated template for default email');
                newTemplates.push({
                  widgetIndex: Number(i),
                  buttonIndex: Number(j),
                  name: `Default Email - ${widget.settings.title} - ${application.name}`,
                  subject: button.subject,
                  body: button.bodyText,
                });
              }
              if (button.bodyTextAlternate) {
                console.log('\tCreated template for empty email');
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
      btn.mailTemplate = isArray(btn.mailTemplate)
        ? btn.mailTemplate.concat(addedId)
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
  // autoReconnect: true,
  // reconnectInterval: 5000,
  // reconnectTries: 3,
  poolSize: 10,
});
// Once connected, update templates
mongoose.connection.once('open', async () => {
  await migrateTemplates();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
