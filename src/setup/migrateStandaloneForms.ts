import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Form, Resource, Record, Dashboard } from '../models';
import { buildTypes } from '../utils/schema';
import { isArray } from 'lodash';
dotenv.config();

/** Migrate standalone forms to resource linked ones */
const migrateForms = async () => {
  // getting forms not linked to resources
  const standaloneForms = await Form.find({ resource: { $exists: false } });

  // gets conflicting resource by name
  const conflictingResources = (
    await Resource.find({
      name: { $in: standaloneForms.map((x) => x.name) },
    })
  ).map((x) => x.name);

  // deals with name conflicts
  const forms = standaloneForms.filter((f) => {
    if (conflictingResources.includes(f.name)) {
      console.error(
        `Error migrating form ${f.name}: Resource with same name already exists`
      );
      return false;
    }
    return true;
  });

  if (forms.length === 0) {
    console.log('No forms to migrate');
    return;
  }

  // creates new resources from the filtered forms
  const newResources = forms.map(
    (form) =>
      new Resource({
        name: form.name,
        fields: form.fields,
        permissions: {
          canSee: form.permissions.canSee,
          canUpdate: form.permissions.canUpdate,
          canDelete: form.permissions.canDelete,
        },
        layouts: form.layouts,
      })
  );

  const resources = await Resource.insertMany(newResources);
  console.log(
    `\nCreated resources: ${resources.map((x) => x.name).join(', ')}`
  );
  const dashboards = await Dashboard.find();

  // add resource id to forms and all its records
  for (const form of forms) {
    const resourceID = resources.find((r) => r.name === form.name)._id;

    await Form.updateOne(
      { _id: form._id },
      {
        $set: {
          resource: resourceID,
          layouts: [],
          core: true,
        },
      }
    );
    console.log(`\nLinked resource in ${form.name} form and removed layouts`);
    await Record.updateMany({ form: form._id }, { resource: resourceID });
    console.log(`Linked resource in all of ${form.name} form's records`);

    for (const dashboard of dashboards) {
      if (dashboard.structure && isArray(dashboard.structure)) {
        let updated = false;
        for (const widget of dashboard.structure) {
          if (
            widget &&
            widget.component === 'grid' &&
            widget.settings?.resource == form._id
          ) {
            widget.settings.resource = resourceID;
            updated = true;
          }
        }
        if (updated) {
          await Dashboard.findByIdAndUpdate(dashboard.id, {
            modifiedAt: new Date(),
            structure: dashboard.structure,
          });
        }
      }
    }
    console.log(`Updated grid widgets linked to ${form.name} form`);
  }

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
  await migrateForms();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
