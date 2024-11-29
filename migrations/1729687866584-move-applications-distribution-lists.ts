import { Application, DistributionList, EmailDistributionList } from '@models';
import { startDatabaseForMigration } from 'migrations/database.helper';

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
    for (const distributionList of application.distributionLists as unknown as DistributionList[]) {
      const regex = new RegExp(
        `^${distributionList.name}(_new)?( \([0-9]+\))?(_[0-9]+)?$`
      );
      const conflictingDLs = await EmailDistributionList.find({
        name: { $regex: regex },
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
        _id: distributionList._id,
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
    // First try: attempt to save all conflict updates.
    // Mongo may try to rename "test" to "test_new", while "test_new" already exists and is due to be renamed to "test_new_new"
    await EmailDistributionList.bulkWrite(conflictUpdates, { ordered: false });
  } catch (error) {
    try {
      // Second try: find the documents that previously failed and attempt to save them again, since the conflicts have been updated
      const failedIds = error.writeErrors.map((err) => err.err.op.q._id);
      const failedDLs = conflictUpdates.filter((update) =>
        failedIds.includes(update._id)
      );
      await EmailDistributionList.bulkWrite(failedDLs);
    } catch (error2) {
      console.error('Error during conflict resolution:', error2);
      console.error(error2.writeErrors);
      throw error2;
    }
  }
  // Save new templates and remove templates from Application.
  try {
    await EmailDistributionList.bulkSave(applicationDLs);
    await Application.updateMany({ $unset: { distributionLists: 1 } });
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
