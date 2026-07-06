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
 * @param pageContext The context of the page
 * @param id The id of the record or element
 * @param context The GraphQL execution context
 * @param contextData Already resolved context data, if available, to avoid recomputing it
 * @returns The name of the new dashboard
 */
export const getNewDashboardName = async (
  dashboard: Dashboard,
  pageContext: Page['context'],
  id: string | Types.ObjectId,
  context: Context,
  contextData?: any
) => {
  if ('refData' in pageContext && pageContext.refData) {
    if (contextData !== undefined) {
      return `${get(contextData, pageContext.displayField) ?? ''}`;
    }
    // Get items from reference data
    const referenceData = await ReferenceData.findById(pageContext.refData);
    const apiConfiguration = await ApiConfiguration.findById(
      referenceData.apiConfiguration
    );
    const data = apiConfiguration
      ? await (
          context.dataSources[apiConfiguration.name] as CustomAPI
        ).getReferenceDataItems(referenceData, apiConfiguration)
      : referenceData.data;

    const item = data.find((x) => get(x, referenceData.valueField) == id);
    return get(item, pageContext.displayField);
  } else if ('resource' in pageContext && pageContext.resource) {
    if (contextData !== undefined) {
      return `${get(contextData, pageContext.displayField) ?? ''}`;
    }
    // Resolve record data the same way dashboard.contextData is built,
    // so calculated fields used as the display field are evaluated correctly.
    context.user.ability = await extendAbilityForRecords(context.user);
    const data = await getContextDataForRecord(
      pageContext.resource,
      id as Types.ObjectId,
      context
    );
    return `${get(data, pageContext.displayField) ?? ''}`;
  }

  // Default return, should never happen
  return dashboard.name;
};
