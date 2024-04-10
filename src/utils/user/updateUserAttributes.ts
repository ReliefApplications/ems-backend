import config from 'config';
import i18next from 'i18next';
import jsonpath from 'jsonpath';
import { isEmpty, set } from 'lodash';
import { ReferenceData, User } from '@models';
import { logger } from '@services/logger.service';
import { AttributeSettings } from './userManagement';
import dataSources, { CustomAPI } from '@server/apollo/dataSources';

/**
 * Check if we need to update user attributes and perform it when needed.
 *
 * @param user Logged user to update.
 * @param req Original req.
 * @returns Boolean to indicate if there is any change in the user.
 */
export const updateUserAttributes = async (
  user: User,
  req: any
): Promise<boolean> => {
  try {
    // Get settings
    const settings: AttributeSettings = config.get('user.attributes');
    // Check if we have correct settings to update user attributes from external system
    if (settings.local) return false;
    if (
      !settings.referenceData ||
      !settings.endpoint ||
      !settings.mapping ||
      isEmpty(settings.mapping)
    ) {
      logger.error(
        i18next.t(
          'utils.user.updateUserAttributes.errors.missingObjectParameters',
          {
            object: 'user attributes settings',
          }
        )
      );
      return false;
    }

    const referenceData = await ReferenceData.findById(
      settings.referenceData
    ).populate({
      path: 'apiConfiguration',
      model: 'ApiConfiguration',
    });

    if (referenceData) {
      const contextDataSources = (
        await dataSources({
          // Passing upstream request so accesstoken can be used for authentication
          req: req,
        } as any)
      )();
      const dataSource = contextDataSources[
        (referenceData.apiConfiguration as any).name
      ] as CustomAPI;

      const items =
        (await dataSource.getReferenceDataItems(
          referenceData,
          referenceData.apiConfiguration as any,
          { emailaddress: user.username }
        )) || [];

      for (const mapping of settings.mapping) {
        const value = jsonpath.value(items[0], mapping.value);
        set(user, mapping.field, value);
      }
      user.markModified('attributes');
      return settings.mapping.length > 0;
    } else {
      // Api configuration does not exist
      return false;
    }
  } catch {
    logger.error('Fail to update user attributes');
    return false;
  }
};
