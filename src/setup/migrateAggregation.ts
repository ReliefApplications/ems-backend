import mongoose from 'mongoose';
import { Application, Dashboard, Form, Page } from '../models';
import { contentType } from '../const/enumTypes';
import { startDatabase } from '../server/database';

/** Migrate worflows and dashboard layouts */
const migrateAggregation = async () => {
  const applications = await Application.find()
    .populate({
      path: 'pages',
      model: 'Page',
    })
    .select('name pages');
  for (const application of applications) {
    if (application.pages.length > 0) {
      // Update dashboard pages
      const dashboards = await Dashboard.find({
        _id: {
          $in: application.pages
            .filter((x: Page) => x.type === contentType.dashboard)
            .map((x: any) => x.content),
        },
      });
      for (const dashboard of dashboards) {
        if (!!dashboard.structure) {
          let index = 0;
          for await (const structure of dashboard.structure) {
            if (
              structure.component == 'chart' &&
              !!structure.settings &&
              structure.settings?.chart &&
              structure.settings?.chart.aggregation
            ) {
              if (structure.settings?.chart.aggregation.dataSource) {
                const aggregationData = structure.settings?.chart.aggregation;
                const dataSourceId =
                  structure.settings?.chart.aggregation.dataSource;

                //get form and resource
                const formData = await Form.findById(dataSourceId).populate(
                  'resource'
                );

                formData.resource.aggregations.push(aggregationData);

                //save aggregation object in the resource
                let saveData = await formData.resource.save();

                let aggregationId: any;
                if (!!structure.settings.chart.aggregationid) {
                  let aggregationId = structure.settings.chart.aggregationid;
                  if (!!aggregationId) {
                    aggregationId.push(
                      saveData.aggregations[saveData.aggregations.length - 1]
                        ._id
                    );
                  } else {
                    aggregationId =
                      saveData.aggregations[saveData.aggregations.length - 1]
                        ._id;
                  }
                } else {
                  aggregationId =
                    saveData.aggregations[saveData.aggregations.length - 1]._id;
                }

                dashboard.structure[index].settings.chart.aggregationid =
                  aggregationId;

                //add aggregation id in the dashboard documents
                await Dashboard.findByIdAndUpdate(
                  dashboard._id,
                  {
                    structure: dashboard.structure,
                  },
                  { new: true }
                );
              }
            }
            index++;
          }
        }
      }
    }
  }
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
console.log('migratition calll =========>>>>>>>> ');
// Once connected, update layouts
mongoose.connection.once('open', async () => {
  await migrateAggregation();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
