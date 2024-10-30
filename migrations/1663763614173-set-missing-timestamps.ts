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
  Step,
  User,
  Workflow,
  Version,
} from '../src/models';

/** Migration description */
export const description = 'Add missing createdAt / updatedAt to objects';

/**
 * Use to documents date migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  for (const x of [
    Application,
    Dashboard,
    Form,
    Group,
    Page,
    Record,
    Resource,
    ReferenceData,
    Step,
    User,
    Workflow,
    Version,
  ]) {
    await x.updateMany(
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
  }

  for (const x of [
    Application,
    Dashboard,
    Form,
    Group,
    Page,
    Record,
    Resource,
    ReferenceData,
    Step,
    User,
    Workflow,
  ]) {
    await x.updateMany(
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
  }
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
