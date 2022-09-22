import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
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
 * get query for createdAt column add.
 *
 * @return query return of createdAt
 */
const getCreatedAtQuery = async () => {
  return [
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
  ];
};

/**
 * get query for modifiedAt column add.
 *
 * @return query return of modifiedAt
 */
const getModifiedAtQuery = async () => {
  return [
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
  ];
};

/**
 * Use to documents date migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  const createdAtQuery = await getCreatedAtQuery();
  const modifiedAtQuery = await getModifiedAtQuery();

  //add createdAt column in the application model
  await Application.updateMany(
    { createdAt: { $exists: false } },
    createdAtQuery,
    { timestamps: false }
  );

  //add modifiedAt column in the application model
  await Application.updateMany(
    { modifiedAt: { $exists: false } },
    modifiedAtQuery,
    { timestamps: false }
  );

  //add createdAt column in the dashboard model
  await Dashboard.updateMany(
    { createdAt: { $exists: false } },
    createdAtQuery,
    { timestamps: false }
  );

  //add modifiedAt column in the dashboard model
  await Dashboard.updateMany(
    { modifiedAt: { $exists: false } },
    modifiedAtQuery,
    { timestamps: false }
  );

  //add createdAt column in the form model
  await Form.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the form model
  await Form.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add createdAt column in the group model
  await Group.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the group model
  await Group.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add createdAt column in the page model
  await Page.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the page model
  await Page.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add createdAt column in the record model
  await Record.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the record model
  await Record.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add createdAt column in the resource model
  await Resource.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the referenceData model
  await ReferenceData.updateMany(
    { modifiedAt: { $exists: false } },
    modifiedAtQuery,
    { timestamps: false }
  );

  //add modifiedAt column in the setting model
  await Setting.updateMany(
    { modifiedAt: { $exists: false } },
    modifiedAtQuery,
    { timestamps: false }
  );

  //add createdAt column in the step model
  await Step.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the step model
  await Step.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the user model
  await User.updateMany({ modifiedAt: { $exists: false } }, modifiedAtQuery, {
    timestamps: false,
  });

  //add createdAt column in the Workflow model
  await Workflow.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });

  //add modifiedAt column in the Workflow model
  await Workflow.updateMany(
    { modifiedAt: { $exists: false } },
    modifiedAtQuery,
    { timestamps: false }
  );

  //add createdAt column in the Version model
  await Version.updateMany({ createdAt: { $exists: false } }, createdAtQuery, {
    timestamps: false,
  });
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
