import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Form, Record, User } from '@models';
import { logger } from '@services/logger.service';

/**
 * Update _createdBy field.
 */
const updateCreatedBy = async () => {
  logger.info('Preparing update of created by');
  const users = await User.find({}, 'name username');
  const updates = [];
  for (const user of users) {
    updates.push({
      updateMany: {
        filter: {
          'createdBy.user': user._id,
        },
        update: {
          _createdBy: {
            user: {
              _id: user._id,
              name: user.name,
              username: user.username,
            },
          },
        },
        timestamps: false,
      },
    });
  }
  await Record.bulkWrite(updates);
  logger.info('Update of created by done');
};

/**
 * Update _form field.
 */
const updateForm = async () => {
  logger.info('Preparing update of form');
  const forms = await Form.find({}, 'name');
  const updates = [];
  for (const form of forms) {
    updates.push({
      updateMany: {
        filter: {
          form: form._id,
        },
        update: {
          _form: {
            _id: form._id,
            name: form.name,
          },
        },
        timestamps: false,
      },
    });
  }
  await Record.bulkWrite(updates);
  logger.info('Update of form done');
};

/**
 * Update _lastUpdateForm field.
 */
const updateLastUpdateForm = async () => {
  logger.info('Preparing update of last update form');
  const forms = await Form.find({}, 'name');
  const updates = [];
  for (const form of forms) {
    updates.push({
      updateMany: {
        filter: {
          lastUpdateForm: form._id,
        },
        update: {
          _lastUpdateForm: {
            _id: form._id,
            name: form.name,
          },
        },
        timestamps: false,
      },
    });
  }
  await Record.bulkWrite(updates);
  logger.info('Update of last update form done');
};

/**
 * Update _lastUpdatedBy field.
 */
const updateLastUpdatedBy = async () => {
  logger.info('Preparing update of _lastUpdatedBy field.');
  const countRecords = await Record.countDocuments();
  const pageSize = 5000;
  for (let i = 0; i < countRecords; i += pageSize) {
    logger.info(`Updating records from index ${i} to ${i + pageSize}`);
    await Record.aggregate([
      {
        $skip: i,
      },
      {
        $limit: pageSize,
      },
      {
        $project: {
          _createdBy: 1,
          versions: 1,
        },
      },
      {
        $addFields: {
          lastVersion: {
            $last: '$versions',
          },
        },
      },
      // {
      //   $sort: {
      //     lastVersion: -1,
      //   },
      // },
      {
        $lookup: {
          from: 'versions',
          let: {
            lastVersion: '$lastVersion',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$lastVersion'],
                },
              },
            },
            {
              $project: {
                createdBy: 1,
              },
            },
          ],
          as: 'lastVersion',
        },
      },
      {
        $unwind: {
          path: '$lastVersion',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          let: {
            lastVersionUser: '$lastVersion.createdBy',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$lastVersionUser'],
                },
              },
            },
            {
              $project: {
                name: 1,
                username: 1,
              },
            },
          ],
          as: 'lastUpdatedBy',
        },
      },
      {
        $unwind: {
          path: '$lastUpdatedBy',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _createdBy: 1,
          lastUpdatedBy: 1,
        },
      },
      {
        $addFields: {
          '_lastUpdatedBy.user': {
            $ifNull: ['$lastUpdatedBy', '$_createdBy.user'],
          },
        },
      },
      {
        $set: {
          _lastUpdatedBy: {
            user: '$_lastUpdatedBy.user',
          },
        },
      },
    ]);
  }
  logger.info('Update of last updated by done');
};

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  await updateCreatedBy();
  await updateForm();
  await updateLastUpdateForm();
  await updateLastUpdatedBy();
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
