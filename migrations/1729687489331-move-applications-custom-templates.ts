import { Application, User } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { CustomTemplate } from '@models/customTemplate.model';
/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const applications = await Application.find({
    templates: { $ne: [] },
  }).populate('createdBy');
  const applicationTemplates: CustomTemplate[] = [];
  const conflictUpdates = [];

  // Migrate all templates to CustomTemplates collection
  for (const application of applications) {
    for (const template of application.templates) {
      // Find existing Custom Templates with conflicting name, applicationId
      const conflictingCTs = await CustomTemplate.find({
        name: template.name,
        applicationId: application._id,
      });
      // Rename existing conflicting CTs to ${name}_new
      if (conflictingCTs.length > 0) {
        conflictingCTs.forEach((conflictingCT, index) => {
          const newName = `${conflictingCT.name}_new${
            index > 0 ? `_${index}` : ''
          }`;
          conflictUpdates.push({
            updateOne: {
              filter: { _id: conflictingCT._id },
              update: { $set: { name: newName } },
            },
          });
        });
      }
      const newTemplate = new CustomTemplate({
        name: template.name,
        subject: template.content.subject,
        body: {
          bodyHtml: template.content.body?.replaceAll('dataset', 'Block 1'),
          bodyBackgroundColor: '#ffffff',
          bodyTextColor: '#000000',
          bodyStyle:
            'text-align: center; margin: 0.5rem auto; padding: 0.5rem; width: 90%;overflow-x: auto; background-color: #ffffff; color: #000000;',
        },
        header: {
          headerHtml: null,
          headerLogo: null,
          headerLogoStyle:
            'margin: 0.5rem; display: block; width: 20%; padding: 0.25rem 0.5rem; border-radius: 0.375rem; background-color: #00205c;',
          headerBackgroundColor: '#00205c',
          headerTextColor: '#ffffff',
          headerHtmlStyle:
            "text-align: center; margin: 0.5rem auto; padding: 0.5rem; width: 80%; overflow: hidden; background-color: #00205c; color: #ffffff; font-family: 'Source Sans Pro', Roboto, 'Helvetica Neue', sans-serif;",
          headerStyle:
            'margin: 0 auto; display: flex; width: 100%; background-color: #00205c;',
        },
        banner: {
          bannerImage: null,
          bannerImageStyle:
            'max-width: 100%; height: auto; object-fit: contain; padding-bottom: 0.5rem;',
          containerStyle:
            'border: 2px solid #00205C; width: 100%; height: 100%; box-sizing: border-box; display: flex; flex-direction: column;',
          copyrightStyle:
            "text-align: center; width: 100%; padding-top: 0.5rem; padding-bottom: 0.5rem; box-sizing: border-box; background-color: #00205C; color: white; font-family: 'Source Sans Pro', Roboto, 'Helvetica Neue', sans-serif; margin-top: auto;",
        },
        footer: {
          footerLogo: null,
          footerBackgroundColor: '#ffffff',
          footerTextColor: '#000000',
          footerStyle:
            'margin: 0.25rem 0; display: flex; width: 90%; background-color: #ffffff;',
          footerImgStyle:
            'margin: 0.5rem; display: block; width: 20%; padding: 0.25rem 0.5rem; border-radius: 0.375rem; background-color: #ffffff;',
          footerHtmlStyle:
            "width: 80%; overflow: hidden; background-color: #ffffff; color: #000000; font-family: 'Source Sans Pro', Roboto, 'Helvetica Neue', sans-serif;",
        },
        createdBy: {
          name: (application.createdBy as any as User)?.name,
          email: (application.createdBy as any as User)?.username,
        },
        createdAt: template.createdAt,
        modifiedAt: template.modifiedAt,
        isFromEmailNotification: false,
        applicationId: application._id,
        isDeleted: 0,
      });
      // Application layouts don't have uniqueness constraint
      // If there are duplicates, they become {name} ({index})
      let duplicateCount = 0;
      while (
        applicationTemplates.find(
          (ct) =>
            ct.name === newTemplate.name && ct.applicationId === application._id
        )
      ) {
        duplicateCount++;
        newTemplate.name = `${template.name} (${duplicateCount})`;
      }

      applicationTemplates.push(newTemplate);
    }
  }

  try {
    await CustomTemplate.bulkWrite(conflictUpdates);
    try {
      await CustomTemplate.bulkSave(applicationTemplates);
    } catch (error) {
      console.error('Error during migration:', error);
    }
  } catch (error) {
    console.error('Error during conflict resolution:', error);
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
