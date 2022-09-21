import { isArray, get } from 'lodash';
import { getDb } from '../migrations-utils/db';
import { Dashboard } from '../src/models';

getDb();

/**
 * Update a chart widget. Function by edge effect
 *
 * @param widget The widget to update
 * @returns A boolean, indicating if the widget has been updated
 */
const updateWidget = async (widget: any): Promise<boolean> => {
  let updated = false;
  const aggregation = widget.settings?.chart?.aggregation;
  // update the groupBy field to a list of fields
  for (const stage of aggregation?.pipeline || []) {
    if (stage.type === 'group' && !isArray(stage.form.groupBy)) {
      stage.form.groupBy = [
        {
          field: stage.form.groupBy,
          expression: {
            operator: get(stage, 'form.groupByExpression.operator', null),
            field: '',
          },
        },
      ];
      updated = true;
    }
  }
  // update xAxis and yAxis to category and field
  if (aggregation?.mapping.xAxis) {
    aggregation.mapping = {
      category: aggregation.mapping.xAxis,
      field: aggregation.mapping.yAxis,
    };
    updated = true;
  }
  return updated;
};

/**
 * Use to chart migrate up.
 *
 * @returns just migrate data.
 */
export const up = async () => {
  const dashboards = await Dashboard.find().select('id structure');
  for (const dashboard of dashboards) {
    if (isArray(dashboard.structure)) {
      let updated = false;
      for (const widget of dashboard.structure) {
        if (widget.component === 'chart') {
          if (await updateWidget(widget)) {
            updated = true;
          }
        }
      }
      if (updated) {
        await Dashboard.findByIdAndUpdate(dashboard.id, {
          modifiedAt: new Date(),
          structure: dashboard.structure,
        });
        console.log(`Dashboard ${dashboard.id} updated.`);
      }
    }
  }
};

/**
 * Use to chart migrate down.
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
