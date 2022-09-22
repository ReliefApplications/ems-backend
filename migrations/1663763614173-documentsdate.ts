import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import mongoose from 'mongoose';
import {
  Application,
  Dashboard,
  Form,
  Group,
  Page,
  Record,
  Resource,
  ReferenceData,
  Setting,
  Step,
  User,
  Workflow,
  Version,
} from '../src/models';

startDatabaseForMigration();

/**
 * Use to documents date migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  //add createdAt and modifiedAt column in the application model
  await Application.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the dashboard model
  await Dashboard.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the form model
  await Form.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the group model
  await Group.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the page model
  await Page.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the record model
  await Record.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the resource model
  await Resource.updateMany(
    { createdAt: { $exists: false } },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the referenceData model
  await ReferenceData.updateMany(
    { modifiedAt: { $exists: false } },
    [
      {
        $set: {
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the setting model
  await Setting.updateMany(
    { modifiedAt: { $exists: false } },
    [
      {
        $set: {
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the step model
  await Step.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the user model
  await User.updateMany(
    { modifiedAt: { $exists: false } },
    [
      {
        $set: {
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the Workflow model
  await Workflow.updateMany(
    {
      $or: [
        { createdAt: { $exists: false } },
        { modifiedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
          modifiedAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );

  //add createdAt and modifiedAt column in the Version model
  await Version.updateMany(
    { createdAt: { $exists: false } },
    [
      {
        $set: {
          createdAt: {
            $convert: {
              input: '$_id',
              to: 'date',
            },
          },
        },
      },
    ],
    { timestamps: false }
  );
};

/**
 * Use to documents date migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
