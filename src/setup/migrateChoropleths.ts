import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Dashboard } from '../models';
dotenv.config();

/** Migrate map widgets setting 'clorophlets' prop name to 'choropleths' */
const renameChoropleth = async () => {
  // gets all dashboards
  const dashboards = await Dashboard.find({
    structure: { $exists: true, $ne: [] },
  });

  const promises = [];
  dashboards.forEach((dashboard) => {
    const usingClorophlet = [];
    for (const i in dashboard.structure) {
      if (dashboard.structure[i].component != 'map') continue;
      if (
        dashboard.structure[i].settings &&
        dashboard.structure[i].settings.hasOwnProperty('clorophlets')
      ) {
        usingClorophlet.push(i);
        console.log(
          `Migrating map '${dashboard.structure[i].name}' from dashboard '${dashboard.name}'`
        );
      }
    }

    if (usingClorophlet.length === 0) return;

    const newStructure = JSON.parse(JSON.stringify(dashboard.structure));
    usingClorophlet.forEach((i) => {
      Object.assign(newStructure[i].settings, {
        choropleths: newStructure[i].settings.clorophlets,
      });
      delete newStructure[i].settings.clorophlets;
    });
    promises.push(
      Dashboard.findByIdAndUpdate(dashboard._id, {
        $set: { structure: newStructure },
      })
    );
  });

  await Promise.all(promises);
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
        useFindAndModify: false,
      }
    );
  } else {
    mongoose.connect(
      `${process.env.DB_PREFIX}://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${process.env.APP_NAME}@`
    );
  }
}
mongoose.connection.once('open', async () => {
  await renameChoropleth();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
