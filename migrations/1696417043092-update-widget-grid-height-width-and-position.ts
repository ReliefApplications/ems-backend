import { Dashboard } from '@models';
import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { logger } from '@services/logger.service';

/**
 * Set the given widget in the grid using given source coordinates
 *
 * @param {number} yAxis y axis point from where start
 * @param {number} xAxis x axis point from where start
 * @param widget widget to set in the grid
 * @returns new coordinates from where to set the given widget in the grid
 */
function setXYAxisValues(
  yAxis: number,
  xAxis: number,
  widget: any
): { x: number; y: number } {
  // Update with the last values of the grid item pointer
  yAxis += widget.cols ?? widget.defaultCols;
  if (yAxis > 8) {
    xAxis += widget.rows ?? widget.defaultRows;
  }

  if (yAxis + (widget.cols ?? widget.defaultCols) > 8) {
    yAxis = 0;
    xAxis += widget.rows ?? widget.defaultRows;
  }
  return { x: xAxis, y: yAxis };
}

/**
 * Updates layout based on the passed widget array.
 *
 * @param dashboardName dashboard name of the given widgets
 * @param widgets widgets to update
 * @returns widgets
 */
function setLayout(dashboardName: string, widgets: any[]): any[] {
  const yAxis = 0;
  const xAxis = 0;
  const mappedWidgets = widgets.map((widget, index) => {
    logger.info(
      `Updating widget settings for the new angular gridster grid: Dashboard ${dashboardName} - Widget ID: ${widget.id}\n`
    );
    const { x, y } =
      index === 0 ? { x: 0, y: 0 } : setXYAxisValues(yAxis, xAxis, widget);
    const gridItem = {
      ...widget,
      cols: widget.cols ?? widget.defaultCols,
      rows: widget.rows ?? widget.defaultRows,
      minItemRows: widget.minRow,
      y: widget.y ?? y,
      x: widget.x ?? x,
    };
    if (index === 0) {
      setXYAxisValues(yAxis, xAxis, widget);
    }
    return gridItem;
  });
  return mappedWidgets;
}

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();

  const allDashboards = await Dashboard.find({});
  for (const dashboard of allDashboards) {
    if (!dashboard.structure || !Array.isArray(dashboard.structure)) {
      continue;
    }
    dashboard.structure = setLayout(dashboard.name, dashboard.structure);
    await dashboard.save();
  }
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
