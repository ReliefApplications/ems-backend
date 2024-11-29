import { Application, User } from '@models';
import { startDatabaseForMigration } from 'migrations/database.helper';
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
      const regex = new RegExp(
        `^${template.name}(_new)?( \([0-9]+\))?(_[0-9]+)?$`
      );
      // Find existing Custom Templates with conflicting name, applicationId
      const conflictingCTs = await CustomTemplate.find({
        name: { $regex: regex },
        applicationId: application._id,
      });
      // Rename existing conflicting CTs to ${name}_new
      if (conflictingCTs.length > 0) {
        conflictingCTs.forEach((conflictingCT, index) => {
          // Objects named template_new, template_new_2, template_new_3, etc will become template_new_new, template_new_2_new_2, etc
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
        _id: template._id,
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
    // First try: attempt to save all conflict updates.
    // Mongo may try to rename "test" to "test_new", while "test_new" already exists and is due to be renamed to "test_new_new"
    await CustomTemplate.bulkWrite(conflictUpdates, { ordered: false });
  } catch (error) {
    try {
      // Second try: find the documents that previously failed and attempt to save them again, since the conflicts have been updated
      const failedIds = error.writeErrors.map((err) => err.err.op.q._id);
      const failedTemplates = conflictUpdates.filter((update) =>
        failedIds.includes(update._id)
      );
      await CustomTemplate.bulkWrite(failedTemplates);
    } catch (error2) {
      console.error('Error during conflict resolution:', error2);
      throw error2;
    }
  }
  // Save new templates and remove templates from Application.
  try {
    await CustomTemplate.bulkSave(applicationTemplates);
    await Application.updateMany({ $unset: { templates: 1 } });
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
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
