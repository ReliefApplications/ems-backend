import { Form, Record, Version } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@services/logger.service';
import { Types } from 'mongoose';

/**
 * Gets the ObjectId from a BSON object
 *
 * @param bson BSON object
 * @returns The ObjectId of the BSON object
 */
const getOidFromBson = (bson: any) =>
  new Types.ObjectId(bson._doc.id.toString('hex'));

/** Migrates forms to have the version docs embedded instead of just ids */
const migrateForms = async () => {
  // Get forms that have not been migrated yet
  const forms = await Form.find({
    versions: { $not: { $size: 0 } },
    $expr: {
      $eq: [{ $type: { $arrayElemAt: ['$versions', 0] } }, 'objectId'],
    },
  });
  if (!!forms.length)
    logger.info(`Embedding versions into ${forms.length} forms...`);
  else logger.info('No forms to migrate, skipping...');

  const allVersionsToQuery: Types.ObjectId[] = [];
  forms.forEach((f) => {
    // Since schema was updated, we need to convert the ids to ObjectIds
    f.versions.forEach((v) => {
      allVersionsToQuery.push(getOidFromBson(v));
    });
  });

  // Remove duplicates from the array (not sure why there are duplicates sometimes)
  const versionsToQuery = [];
  allVersionsToQuery.forEach((v) => {
    if (!versionsToQuery.find((v2) => v2.equals(v))) versionsToQuery.push(v);
  });

  const versions = await Version.find({
    _id: { $in: versionsToQuery },
  });

  forms.forEach((f) => {
    const versionsToEmbed = versions.filter((v) =>
      f.versions.find((v2) => getOidFromBson(v2).equals(v._id))
    );

    f.versions = versionsToEmbed;
  });

  // Update forms with the versions embedded
  await Form.bulkSave(forms);

  // Remove the version docs from the database
  await Version.deleteMany({
    _id: { $in: versionsToQuery },
  });

  logger.info('Finished embedding versions into forms.');
};

/** Migrates records to have the version docs embedded instead of just ids */
const migrateRecords = async () => {
  // Get records that have not been migrated yet
  const records = await Record.find({
    versions: { $not: { $size: 0 } },
    $expr: {
      $eq: [{ $type: { $arrayElemAt: ['$versions', 0] } }, 'objectId'],
    },
  });

  if (!!records.length)
    logger.info(`Embedding versions into ${records.length} records...`);
  else logger.info('No records to migrate, skipping...');

  const allVersionsToQuery: Types.ObjectId[] = [];
  records.forEach((r) => {
    // Since schema was updated, we need to convert the ids to ObjectIds
    r.versions.forEach((v) => {
      allVersionsToQuery.push(getOidFromBson(v));
    });
  });

  // Remove duplicates from the array (not sure why there are duplicates sometimes)
  const versionsToQuery = [];
  allVersionsToQuery.forEach((v) => {
    if (!versionsToQuery.find((v2) => v2.equals(v))) versionsToQuery.push(v);
  });

  const versions = await Version.find({
    _id: { $in: versionsToQuery },
  });

  records.forEach((r) => {
    const versionsToEmbed = versions.filter((v) =>
      r.versions.find((v2) => getOidFromBson(v2).equals(v._id))
    );

    r.versions = versionsToEmbed;
  });

  // Update records with the versions embedded
  await Record.bulkSave(records);

  // Remove the version docs from the database
  await Version.deleteMany({
    _id: { $in: versionsToQuery },
  });

  logger.info('Finished embedding versions into records.');
};

/** This migration embeds the version docs into forms/records */
export const up = async () => {
  await startDatabaseForMigration();

  // Migration of forms
  await migrateForms();

  // Migration of records
  await migrateRecords();

  // Drop the version collection (should we do this?)
  // await Version.collection.drop();
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
