import {
  ApiConfiguration,
  Dashboard,
  Page,
  Record,
  ReferenceData,
} from '@models';
import { CustomAPI } from '@server/apollo/dataSources';
import { get } from 'lodash';
import { Types } from 'mongoose';

/**
 * Get the name of the new dashboard, based on the context.
 *
 * @param dashboard The dashboard being duplicated
 * @param context The context of the dashboard
 * @param id The id of the record or element
 * @param dataSources The data sources
 * @returns The name of the new dashboard
 */
export const getNewDashboardName = async (
  dashboard: Dashboard,
  context: Page['context'],
  id: string | Types.ObjectId,
  dataSources: any
) => {
  if ('refData' in context && context.refData) {
    // Get items from reference data
    const referenceData = await ReferenceData.findById(context.refData);
    const apiConfiguration = await ApiConfiguration.findById(
      referenceData.apiConfiguration
    );
    const data = apiConfiguration
      ? await (
          dataSources[apiConfiguration.name] as CustomAPI
        ).getReferenceDataItems(referenceData, apiConfiguration)
      : referenceData.data;

    const item = data.find((x) => get(x, referenceData.valueField) == id);
    return item ? `${item?.[context.displayField]}` : undefined;
  } else if ('resource' in context && context.resource) {
    const record = await Record.findById(id);
    return `${record.data[context.displayField]}`;
  }

  // Default return, should never happen
  return dashboard.name;
};
