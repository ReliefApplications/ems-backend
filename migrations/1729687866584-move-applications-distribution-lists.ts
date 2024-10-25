import { Application, EmailDistributionList } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  const applications = await Application.find({
    distributionLists: { $ne: [] },
  }).populate('createdBy');
  const applicationDLs: EmailDistributionList[] = [];
  const conflictUpdates = [];

  // Migrate all templates to CustomTemplates collection
  for (const application of applications) {
    for (const distributionList of application.distributionLists) {
      const conflictingDLs = await EmailDistributionList.find({
        name: distributionList.name,
        applicationId: application._id,
      });
      // Rename conflicting CTs to ${name}_new
      if (conflictingDLs.length > 0) {
        conflictingDLs.forEach((conflictingDL, index) => {
          const newName = `${conflictingDL.name}_new${
            index > 0 ? `_${index}` : ''
          }`;
          conflictUpdates.push({
            updateOne: {
              filter: { _id: conflictingDL._id },
              update: { $set: { name: newName } },
            },
          });
        });
      }
      const newDL = new EmailDistributionList({
        name: distributionList.name,
        to: {
          inputEmails: distributionList.emails,
        },
        cc: null,
        bcc: null,
        createdAt: distributionList.createdAt,
        modifiedAt: distributionList.modifiedAt,
        createdBy: {
          name: (application.createdBy as any)?.name,
          email: (application.createdBy as any)?.email,
        },
        isDeleted: 0,
        applicationId: application._id,
      });
      let duplicateCount = 0;
      while (
        applicationDLs.find(
          (dl) => dl.name === newDL.name && dl.applicationId === application._id
        )
      ) {
        duplicateCount++;
        newDL.name = `${distributionList.name} (${duplicateCount})`;
      }

      applicationDLs.push(newDL);
    }
  }
  try {
    await EmailDistributionList.bulkWrite(conflictUpdates);
    try {
      await EmailDistributionList.bulkSave(applicationDLs);
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
