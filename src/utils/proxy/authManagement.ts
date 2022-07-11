import { ApiConfiguration } from '../../models';
import { authType } from '../../const/enumTypes';
import * as CryptoJS from 'crypto-js';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';

/**
 * Create a cache instance to store authentication tokens for ApiConfigurations.
 */
export const cache = new NodeCache();

/**
 * Returns the identifier used to retrieve an access token for a specific ApiConfiguration.
 *
 * @param apiConfiguration ApiConfiguration attached to token
 * @returns token id
 */
export const getTokenID = (apiConfiguration: ApiConfiguration): string =>
  `bearer-token-${apiConfiguration.id}`;

/**
 * Get the token for an ApiConfiguration, check first if we have one in the cache, if not fetch it and store it in cache.
 *
 * @param apiConfiguration ApiConfiguration attached to token
 * @returns The access token to authenticate to the ApiConfiguration
 */
export const getToken = async (
  apiConfiguration: ApiConfiguration
): Promise<string> => {
  if (apiConfiguration.authType === authType.public) {
    return '';
  }
  // Return token of we don't need a refresh
  const tokenID = getTokenID(apiConfiguration);
  const oldToken: string = cache.get(tokenID);
  if (oldToken) {
    return oldToken;
  }

  // Switch on all available authTypes
  if (apiConfiguration.authType === authType.serviceToService) {
    // Retrieve credentials and set up authentication request
    const settings: {
      authTargetUrl: string;
      apiClientID: string;
      safeSecret: string;
      scope: string;
    } = JSON.parse(
      CryptoJS.AES.decrypt(
        apiConfiguration.settings,
        process.env.AES_ENCRYPTION_KEY
      ).toString(CryptoJS.enc.Utf8)
    );
    console.log('SETTINGS', settings);
    const details: any = {
      grant_type: 'client_credentials',
      client_id: settings.apiClientID,
      client_secret: settings.safeSecret,
    };
    if (settings.scope) {
      details.scope = settings.scope;
    } else {
      details.resource = 'https://servicebus.azure.net';
    }
    const formBody = [];
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + '=' + encodedValue);
    }
    const body = formBody.join('&');

    // Send authentication request, store result in cache and return
    const res = await fetch(settings.authTargetUrl, {
      method: 'post',
      body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
    });
    const json = await res.json();
    cache.set(tokenID, json.access_token, json.expires_in - 30);
    return json.access_token;
  } else if (apiConfiguration.authType === authType.userToService) {
    // Retrieve access token from settings, store it and return it
    const settings: { token: string } = JSON.parse(
      CryptoJS.AES.decrypt(
        apiConfiguration.settings,
        process.env.AES_ENCRYPTION_KEY
      ).toString(CryptoJS.enc.Utf8)
    );
    cache.set(tokenID, settings.token, 3570);
    return settings.token;
  }
};
