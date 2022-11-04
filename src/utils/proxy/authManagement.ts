import { ApiConfiguration } from '@models';
import { authType } from '@const/enumTypes';
import * as CryptoJS from 'crypto-js';
import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import config from 'config';

/**
 * Create a cache instance to store authentication tokens for ApiConfigurations.
 */
export const cache = new NodeCache();

/**
 * Returns the identifier used to retrieve an access token for a specific ApiConfiguration.
 *
 * @param apiConfigurationID ApiConfiguration ID attached to token.
 * @param userID User ID needed if it's a delegated token.
 * @returns token id
 */
export const getTokenID = (
  apiConfigurationID: string,
  userID?: string
): string =>
  userID
    ? `bearer-token-${apiConfigurationID}-${userID}`
    : `bearer-token-${apiConfigurationID}`;

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
  // Return token if we don't need a refresh
  const tokenID = getTokenID(apiConfiguration.id);
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
        config.get('encryption.key')
      ).toString(CryptoJS.enc.Utf8)
    );
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
        config.get('encryption.key')
      ).toString(CryptoJS.enc.Utf8)
    );
    cache.set(tokenID, settings.token, 3570);
    return settings.token;
  }
};

/**
 * Get the token for an ApiConfiguration using on behalf authorization flow
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow
 *
 * @param apiConfiguration ApiConfiguration to access external API.
 * @param userID Original user ID.
 * @param upstreamToken Original user token used to authenticate to this API.
 * @returns The access token to authenticate to the ApiConfiguration with delegated permissions.
 */
export const getDelegatedToken = async (
  apiConfiguration: ApiConfiguration,
  userID: string,
  upstreamToken: string
): Promise<string> => {
  // Return token if we don't need a refresh
  const tokenID = getTokenID(apiConfiguration.id, userID);
  const oldToken: string = cache.get(tokenID);
  if (oldToken) {
    return oldToken;
  }
  // Retrieve credentials and set up authentication request
  const settings: {
    authTargetUrl: string;
    apiClientID: string;
    safeSecret: string;
    scope: string;
  } = JSON.parse(
    CryptoJS.AES.decrypt(
      apiConfiguration.settings,
      config.get('encryption.key')
    ).toString(CryptoJS.enc.Utf8)
  );
  const details: any = {
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    client_id: settings.apiClientID,
    client_secret: settings.safeSecret,
    assertion: upstreamToken,
    requested_token_use: 'on_behalf_of',
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
};
