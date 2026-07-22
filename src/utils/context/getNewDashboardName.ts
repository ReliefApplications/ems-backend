import { ApiConfiguration, Dashboard, Page, ReferenceData } from '@models';
import { Context } from '@server/apollo/context';
import { CustomAPI } from '@server/apollo/dataSources';
import { get } from 'lodash';
import { Types } from 'mongoose';
import { getContextDataForRecord } from './getContextData';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

/**
 * Get the name of the new dashboard, based on the context.
 *
 * @param dashboard The dashboard being duplicated
 * @param context The context of the dashboard
 * @param id The id of the record or element
 * @param gqlContext Graphql context
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
    return get(data, context.displayField);
  }

  // Default return, should never happen
  return dashboard.name;
};
