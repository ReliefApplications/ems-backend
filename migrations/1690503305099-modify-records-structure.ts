import { startDatabaseForMigration } from '@utils/migrations/database.helper';
import { Record, User, Version } from '@models';
import { logger } from '@services/logger.service';

/** Updates the record structure to add _form, _lastUpdateForm, _createdBy, _lastUpdatedBy documents */
export const up = async () => {
  await startDatabaseForMigration();

  const numRecords = await Record.countDocuments({
    $or: [{ _form: { $exists: false } }, { _form: null }], // Prevent migration to be applied twice
  });

  if (!!numRecords)
    logger.info(
      `Updating ${numRecords} records to add _form, _lastUpdateForm, _createdBy, _lastUpdatedBy fields\nOperation will be divided into ${Math.ceil(
        numRecords / 1000
      )} batches of 1000 records`
    );
  else logger.info('No records to update');

  // Do it in batches of 1000
  for (let i = 0; i < numRecords; i += 1000) {
    logger.info(`Batch ${i / 1000 + 1} of ${Math.ceil(numRecords / 1000)}`);
    const records = await Record.find({
      $or: [{ _form: { $exists: false } }, { _form: null }],
    })
      .skip(i)
      .limit(1000)
      .populate('form lastUpdateForm');

    const usersToQuery: string[] = [];
    const versionsToQuery: string[] = [];
    for (const record of records) {
      if (record.createdBy.user)
        usersToQuery.push(record.createdBy.user.toString());
      if (record.versions.length) {
        // query last version
        versionsToQuery.push(
          record.versions[record.versions.length - 1].toString()
        );
      }
    }

    const versions = await Version.find({
      _id: { $in: versionsToQuery },
    }).populate('createdBy');

    const users = await User.find({
      _id: { $in: usersToQuery },
    });

    users.push(
      ...versions
        .filter((v) =>
          v.createdBy
            ? !usersToQuery.includes(v.createdBy._id.toString())
            : false
        )
        .map((v) => v.createdBy)
    );

    const updates: any[] = [];
    for (const record of records) {
      const createdBy = users.find((u) => u._id.equals(record.createdBy.user));

      const lastUpdatedBy = record.versions.length
        ? versions.find((v) =>
            v._id.equals(record.versions[record.versions.length - 1])
          ).createdBy
        : createdBy;

      updates.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: {
              _form: {
                _id: record.form._id,
                name: record.form.name,
              },
              _lastUpdateForm: record.lastUpdateForm
                ? {
                    _id: record.lastUpdateForm._id,
                    name: record.lastUpdateForm.name,
                  }
                : undefined,
              _createdBy: createdBy
                ? {
                    user: {
                      _id: createdBy._id,
                      name: createdBy.name,
                      username: createdBy.username,
                    },
                  }
                : undefined,
              _lastUpdatedBy: lastUpdatedBy
                ? {
                    user: {
                      _id: lastUpdatedBy._id,
                      name: lastUpdatedBy.name,
                      username: lastUpdatedBy.username,
                    },
                  }
                : undefined,
            },
          },
        },
      });
    }

    await Record.bulkWrite(updates);
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
