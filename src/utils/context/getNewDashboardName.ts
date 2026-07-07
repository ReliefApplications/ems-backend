import { ApiConfiguration, Dashboard, Page, ReferenceData } from '@models';
import { CustomAPI } from '@server/apollo/dataSources';
import { Context } from '@server/apollo/context';
import { getContextDataForRecord } from '@utils/context/getContextData';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { get } from 'lodash';
import { Types } from 'mongoose';

/**
 * Get the name of the new dashboard, based on the context.
 *
 * @param dashboard The dashboard being duplicated
 * @param context The context of the dashboard
 * @param id The id of the record or element
 * @param gqlContext The graphql context
 * @returns The name of the new dashboard
 */
export const getNewDashboardName = async (
  dashboard: Dashboard,
  context: Page['context'],
  id: string | Types.ObjectId,
  gqlContext: Context
) => {
  if ('refData' in context && context.refData) {
    // Get items from reference data
    const referenceData = await ReferenceData.findById(context.refData);
    const apiConfiguration = await ApiConfiguration.findById(
      referenceData.apiConfiguration
    );
    const data = apiConfiguration
      ? await (
          gqlContext.dataSources[apiConfiguration.name] as CustomAPI
        ).getReferenceDataItems(referenceData, apiConfiguration)
      : referenceData.data;

    const item = data.find((x) => get(x, referenceData.valueField) == id);
    return get(item, context.displayField);
  } else if ('resource' in context && context.resource) {
    // Reuse the same logic used for widget context data, so that
    // calculated display fields are resolved instead of coming back undefined
    gqlContext.user.ability = await extendAbilityForRecords(gqlContext.user);
    const data = await getContextDataForRecord(
      context.resource,
      id as Types.ObjectId,
      gqlContext
    );
    const value = data[context.displayField];
    // Format dates the same way the frontend does, instead of Node's verbose
    // default Date.toString() (e.g. "Tue Nov 19 2024 10:23:08 GMT+0000 (...)")
    return value instanceof Date
      ? value.toLocaleDateString('en-US')
      : `${value}`;
  }

  // Default return, should never happen
  return dashboard.name;
};
