import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import get from 'lodash/get';
import set from 'lodash/set';
import { Dashboard, Aggregation, Form } from '../src/models';
import { logger } from '../src/services/logger.service';

/**
 * Use to aggregations migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  try {
    const dashboards = await Dashboard.find({});
    for (const dashboard of dashboards) {
      if (!!dashboard.structure) {
        let index = 0;
        for (const widget of dashboard.structure) {
          if (
            widget &&
            widget.component == 'chart' &&
            get(widget, 'settings.chart.aggregation', null) &&
            !get(widget, 'settings.chart.aggregationId', null)
          ) {
            if (widget.settings?.chart.aggregation.dataSource) {
              const aggregation: Aggregation = get(
                widget,
                'settings.chart.aggregation',
                null
              );
              aggregation.name = `${widget.settings.title} - ${dashboard.name}`;
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
                  logger.info(
                    `Add Aggregation ${aggregation.name} to Resource ${resource.name}`
                  );

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
                  logger.info('skip: related resource / form not found');
                }
              }
            }
          }
          index++;
        }
      }
    }
  } catch (err) {
    logger.error('migrateAggregations catch error ==>> ', err);
  }
};

/**
 * Use to aggregations migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
