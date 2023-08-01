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
// const updateLastUpdatedBy = async () => {
//   logger.info('Preparing update of _lastUpdatedBy field.');
//   await Record.aggregate([
//     [
//       {
//         $addFields: {
//           lastVersion: {
//             $last: '$versions',
//           },
//         },
//       },
//       {
//         $lookup: {
//           from: 'versions',
//           let: {
//             lastVersion: '$lastVersion',
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ['$_id', '$$lastVersion'],
//                 },
//               },
//             },
//             {
//               $project: {
//                 createdBy: 1,
//               },
//             },
//           ],
//           as: 'lastVersion',
//         },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           let: {
//             lastVersionUser: {
//               $last: '$lastVersion.createdBy',
//             },
//           },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: ['$_id', '$$lastVersionUser'],
//                 },
//               },
//             },
//             {
//               $project: {
//                 _id: 1,
//                 name: 1,
//                 username: 1,
//               },
//             },
//           ],
//           as: '_lastUpdatedBy',
//         },
//       },
//       {
//         $unwind: {
//           path: '$_lastUpdatedBy',
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           '_lastUpdatedBy.user': {
//             $ifNull: ['$_lastUpdatedBy.user', '$_createdBy.user', null],
//           },
//         },
//       },
//       {
//         $set: {
//           '_lastUpdatedBy.user': '$_lastUpdatedBy.user',
//         },
//       },
//     ],
//   ]);
//   logger.info('Update of last updated by done');
// };
const updateLastUpdatedBy = async () => {
  // todo: the update is not correct
  logger.info('Preparing update of last updated by');
  const users = await User.find({}, 'name username');
  const updates = [];
  for (const user of users) {
    updates.push({
      updateMany: {
        filter: {
          'createdBy.user': user._id,
        },
        update: {
          _lastUpdatedBy: {
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
