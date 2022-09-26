import mongoose from 'mongoose';
import { Application, Dashboard, Form, Page, Aggregation } from '../models';
import { contentType } from '../const/enumTypes';
import { startDatabase } from '../server/database';
import get from 'lodash/get';
import set from 'lodash/set';

/** Migrate resource aggregation */
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
          for (const widget of dashboard.structure) {
            if (
              widget &&
              widget.component == 'chart' &&
              // !get(widget, 'settings.chart.aggregationId', null) &&
              get(widget, 'settings.chart.aggregation', null)
            ) {
              if (widget.settings?.chart.aggregation.dataSource) {
                const aggregation: Aggregation = get(
                  widget,
                  'settings.chart.aggregation',
                  null
                );
                aggregation.name = `${widget.settings.title} - ${application.name}`;
                const dataSourceId = get(
                  widget,
                  'settings.chart.aggregation.dataSource',
                  null
                );

                if (dataSourceId) {
                  //get form and resource
                  const form = await Form.findById(dataSourceId).populate(
                    'resource'
                  );

                  if (form) {
                    form.resource.aggregations.push(aggregation);

                    //save aggregation object in the resource
                    const resource = await form.resource.save();

                    set(widget, 'settings.resource', resource.id);
                    set(
                      widget,
                      'settings.chart.aggregationId',
                      resource.aggregations.pop().id
                    );
                    set(
                      widget,
                      'settings.chart.mapping',
                      get(widget, 'settings.chart.aggregation.mapping', null)
                    );

                    dashboard.structure[index] = widget;

                    //add aggregation id in the dashboard documents
                    await Dashboard.findByIdAndUpdate(
                      dashboard._id,
                      {
                        structure: dashboard.structure,
                      },
                      { new: true }
                    );
                  } else {
                    console.log('skip: related resource / form not found');
                  }
                }
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

// Once connected, update aggregation
mongoose.connection.once('open', async () => {
  await migrateAggregation();
  mongoose.connection.close(() => {
    console.log('connection closed');
  });
});
