import { Application, EmailDistributionList } from '@models';
import { startDatabaseForMigration } from '../src/migrations/database.helper';

/** Migration description */
export const description =
  'Update email distribution lists stored ine applications, to use new distribution list model.';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  const applications = await Application.find({
    distributionLists: { $exists: true, $ne: [] },
  }).populate('createdBy');

  for (const application of applications) {
    for (const distributionList of application.distributionLists) {
      const newDistributionList = new EmailDistributionList({
        _id: distributionList._id,
        name: distributionList.name,
        to: {
          inputEmails: distributionList.emails,
        },
        cc: {
          inputEmails: [],
        },
        bcc: {
          inputEmails: [],
        },
        createdAt: distributionList.createdAt,
        modifiedAt: distributionList.modifiedAt,
        createdBy: {
          name: (application.createdBy as any)?.name,
          email: (application.createdBy as any)?.email,
        },
        applicationId: application._id,
      });
      try {
        await newDistributionList.save();
      } catch (error) {
        if (error.code === 11000) {
          console.log('has error...');
          // Duplication error
          let duplicationNumber = 1;
          let hasError = true;
          while (hasError) {
            try {
              // Try to save with new name, format is: {name} ({duplicationNumber})
              newDistributionList.name = `${distributionList.name} (${duplicationNumber})`;
              console.log('trying with new name:', newDistributionList.name);
              await newDistributionList.save();
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
