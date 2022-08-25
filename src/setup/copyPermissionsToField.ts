import mongoose from 'mongoose';
import { Form } from '../models';
import { startDatabase } from '../server/database';

/** Migrate standalone forms to resource linked ones */
const copyPermissions = async () => {
  await Form.updateMany({}, [
    {
      $addFields: {
        fields: {
          $map: {
            input: '$fields',
            as: 'fields',
            in: {
              $mergeObjects: [
                '$$fields',
                {
                  permissions: {
                    canSee: {
                      $map: {
                        input: '$permissions.canSeeRecords',
                        as: 'canSeeRecords',
                        in: '$$canSeeRecords.role',
                      },
                    },
                    canUpdate: {
                      $map: {
                        input: '$permissions.canUpdateRecords',
                        as: 'canUpdateRecords',
                        in: '$$canUpdateRecords.role',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  ]);

  console.log('\nCopied permissions to fields successfully');
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
// Once connected, update forms
mongoose.connection.once('open', async () => {
  await copyPermissions();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
