import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Form, ReferenceData } from '../models';
import { buildTypes } from '../utils/schema';
import { toGraphQLCase } from '../utils/validators';
dotenv.config();

/** Migrate standalone forms to resource linked ones */
const migrateGraphQLNames = async () => {
  // update forms
  const forms = await Form.find({ graphQLName: { $exists: false } }).select(
    'name'
  );
  for (const form of forms) {
    await form.updateOne({ graphQLName: toGraphQLCase(form.name) });
  }

  // update reference data
  const referenceDatas = await ReferenceData.find({
    graphQLName: { $exists: false },
  }).select('name');
  for (const referenceData of referenceDatas) {
    await referenceData.updateOne({
      graphQLName: toGraphQLCase(referenceData.name),
    });
  }

  // update the schema
  await buildTypes();

  console.log('\nMigration complete');
};

/**
 * Initialize the database
 */
// eslint-disable-next-line no-undef
if (process.env.COSMOS_DB_PREFIX) {
  mongoose.connect(
    `${process.env.COSMOS_DB_PREFIX}://${process.env.COSMOS_DB_USER}:${process.env.COSMOS_DB_PASS}@${process.env.COSMOS_DB_HOST}:${process.env.COSMOS_DB_PORT}/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.COSMOS_APP_NAME}@`,
    {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
    }
  );
} else {
  if (process.env.DB_PREFIX === 'mongodb+srv') {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
      {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
      }
    );
  } else {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`
    );
  }
}
mongoose.connection.once('open', async () => {
  await migrateGraphQLNames();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
