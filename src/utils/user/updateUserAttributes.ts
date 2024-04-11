import config from 'config';
import i18next from 'i18next';
import jsonpath from 'jsonpath';
import { isEmpty, set } from 'lodash';
import { ReferenceData, User } from '@models';
import { logger } from '@services/logger.service';
import { AttributeSettings } from './userManagement';
import dataSources, { CustomAPI } from '@server/apollo/dataSources';
import axios from 'axios';

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

    // Get delegated token
    const token = req.headers.accesstoken;

    const url = 'https://graph.microsoft.com/v1.0/me';
    const params = {
      $select:
        'givenName,surname,displayName,department,jobTitle,mail,userPrincipalName,userType',
    };
    // Pass it in headers
    const headers: any = token
      ? {
          Authorization:
            'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6InEtMjNmYWxldlpoaEQzaG05Q1Fia1A1TVF5VSJ9.eyJhdWQiOiIwMjEyMDJhYy1kMjNiLTQ3NTctODNlMy1mNmVjZGUxMjI2NmIiLCJpc3MiOiJodHRwczovL2xvZ2luLm1pY3Jvc29mdG9ubGluZS5jb20vZjYxMGMwYjctYmQyNC00YjM5LTgxMGItM2RjMjgwYWZiNTkwL3YyLjAiLCJpYXQiOjE3MTI4Mjg2NzgsIm5iZiI6MTcxMjgyODY3OCwiZXhwIjoxNzEyODMyNTc4LCJhaW8iOiJBYlFBUy84V0FBQUFHdE9USCttRitwVmFxcjllTURPMEkxVjdBRUFrc0FpQmRYeUlwOU0weW56YmU5NnJDdkxVMWl1TzdvbFg2a25OcHRYaW9XL0cvS3hhdVpqVzUwUE5IT3JNcEZFS3RGOTNVeWRpWUtPa0h1WklwMUR3OEcy…pIY0tLM0g1UjZLWXJBSnBySElodk9KQmtVY2hiUkNmdVVsTSIsInRpZCI6ImY2MTBjMGI3LWJkMjQtNGIzOS04MTBiLTNkYzI4MGFmYjU5MCIsInV0aSI6Ik04Ukk5OVJXVUU2dVpyV0RkLXNNQVEiLCJ2ZXIiOiIyLjAifQ.WZTlUBrZFNVY7-pUywQ1PLM3cItaF2Ds33y9iREiYwH_FRuNFCCtXLdGdb_Zw5lHZ8R-9ahzHtmQIblb9JSiT4m8u7A-fAwxvxr5M-G4NwTBpe9C3_HUnsPICPvb1K-NLLWe-R8n89f3kf1RGYMczhSVrdbpJY9dCVMcmQwceGsKfBddX735XuJcZrPpKmvpDEdUrJIIsXfDz44vRLquTx73FlOyooOIjrNXUBJZKtorPQtTDx4Jts4VXWQ8gW7x_vopqo8U65BEHlp1iURBSs4YUAoeu_q8XO8sB-U0lErudaxt1G2oKA-YeTytE07ME8boPwZpxUjNbjXlqFY1bw',
        }
      : {};
    // Fetch new attributes
    let res;
    let data;
    try {
      res = await axios({
        url,
        method: 'get',
        headers,
        params,
      });
      data = res.data;
      console.log(data);
    } catch (err) {
      logger.error(err.message);
      logger.error(i18next.t('common.errors.invalidAPI'), {
        stack: err.stack,
      });
      return false;
    }

    /** Long term solution using common services */
    // const referenceData = await ReferenceData.findById(
    //   settings.referenceData
    // ).populate({
    //   path: 'apiConfiguration',
    //   model: 'ApiConfiguration',
    // });
    // if (referenceData) {
    //   const contextDataSources = (
    //     await dataSources({
    //       req: req,
    //     } as any)
    //   )();
    //   const dataSource = contextDataSources[
    //     (referenceData.apiConfiguration as any).name
    //   ] as CustomAPI;

    //   const items =
    //     (await dataSource.getReferenceDataItems(
    //       referenceData,
    //       referenceData.apiConfiguration as any,
    //       { emailaddress: user.username }
    //     )) || [];

    //   for (const mapping of settings.mapping) {
    //     const value = jsonpath.value(items[0], mapping.value);
    //     set(user, mapping.field, value);
    //   }
    //   user.markModified('attributes');
    //   return settings.mapping.length > 0;
    // } else {
    //   // Ref data does not exist
    //   return false;
    // }
  } catch {
    logger.error('Fail to update user attributes');
    return false;
  }
};
