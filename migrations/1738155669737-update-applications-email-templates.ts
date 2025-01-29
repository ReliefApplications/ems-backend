import { Application } from '@models';
import { startDatabaseForMigration } from '../src/migrations/database.helper';
import { CustomTemplate } from '@models/customTemplate.model';

/** Migration description */
export const description =
  'Update email templates stored ine applications, to use new custom template model.';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const applications = await Application.find({
    templates: { $exists: true, $ne: [] },
  }).populate('createdBy');

  for (const application of applications) {
    for (const template of application.templates) {
      const newTemplate = new CustomTemplate({
        _id: template._id,
        name: template.name,
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
        createdAt: template.createdAt,
        modifiedAt: template.modifiedAt,
        createdBy: {
          name: (application.createdBy as any)?.name,
          email: (application.createdBy as any)?.email,
        },
        isFromEmailNotification: false,
        applicationId: application._id,
      });
      try {
        await newTemplate.save();
      } catch (error) {
        if (error.code === 11000) {
          console.log('has error...');
          // Duplication error
          let duplicationNumber = 1;
          let hasError = true;
          while (hasError) {
            try {
              // Try to save with new name, format is: {name} ({duplicationNumber})
              newTemplate.name = `${template.name} (${duplicationNumber})`;
              console.log('trying with new name:', newTemplate.name);
              await newTemplate.save();
              hasError = false;
            } catch (err) {
              console.log('has error again...');
              console.log(err);
              if (err.code === 11000) {
                // Increase duplication code & continue
                duplicationNumber++;
              } else {
                throw err;
              }
            }
          }
        } else {
          // Other error, need to indicate it
          console.error(error);
        }
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
