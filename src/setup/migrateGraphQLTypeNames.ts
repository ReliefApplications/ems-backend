import mongoose from 'mongoose';
import { Form, ReferenceData } from '../models';
import { buildTypes } from '../utils/schema';
import { startDatabase } from '../server/database';
import { logger } from '../services/logger.service';

/** Migrate forms and ref data to have graphql type name in them */
const executeMigration = async () => {
  // update forms
  const forms = await Form.find({ graphQLTypeName: { $exists: false } }).select(
    'name'
  );
  for (const form of forms) {
    await form.updateOne({
      graphQLTypeName: Form.getGraphQLTypeName(form.name),
    });
  }

  // update reference data
  const referenceDatas = await ReferenceData.find({
    graphQLTypeName: { $exists: false },
  }).select('name');
  for (const referenceData of referenceDatas) {
    await referenceData.updateOne({
      graphQLTypeName: ReferenceData.getGraphQLTypeName(referenceData.name),
    });
  }

  await buildTypes();

  logger.info('\nMigration complete');
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
// Once connected, update forms and reference data
mongoose.connection.once('open', async () => {
  await executeMigration();
  mongoose.connection.close(() => {
    logger.info('connection closed');
  });
});
