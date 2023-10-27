import { ApiConfiguration } from '@models';
import { authType } from '@const/enumTypes';
import * as CryptoJS from 'crypto-js';
import NodeCache from 'node-cache';
import config from 'config';
import axios from 'axios';

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
    console.log('token already saved');
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
    const res = await axios({
      url: settings.authTargetUrl,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
      data: body,
    });
    cache.set(tokenID, res.data.access_token, res.data.expires_in - 30);
    return res.data.access_token;
  }
  if (apiConfiguration.authType === authType.authorizationCode) {
    const whereWeGetTheAuthCode =
      'https://login.microsoftonline.com/f610c0b7-bd24-4b39-810b-3dc280afb590/oauth2/authorize?resource=75deca06-ae07-4765-85c0-23e719062833&response_type=code&client_id=021202ac-d23b-4757-83e3-f6ecde12266b&scope=api%3A%2F%2F75deca06-ae07-4765-85c0-23e719062833%2Faccess_as_user&prompt=none';
    try {
      const code = await axios(whereWeGetTheAuthCode);
      console.log(code, 'could get the code');
    } catch (error) {
      console.log(error, 'could not acquire authcode');
    }

    // Retrieve credentials and set up authentication request
    const settings: {
      callbackUrl: string;
      authUrl: string;
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
      grant_type: 'authorization_code',
      client_id: settings.apiClientID,
      client_secret: settings.safeSecret,
      code: '0.AUcAt8AQ9iS9OUuBCz3CgK-1kKwCEgI70ldHg-P27N4SJmsAAAA.AgABAAIAAAAtyolDObpQQ5VtlI4uGjEPAgDs_wUA9P8m69xgCpzA9GUxLv6DAva-hWvGWOUPSC15DUggawAIjwMfOtK-kWqEjuFfuptVZHVk91F9QTsLKFlYJ-Qae0xJaq64WjEfDpJxspK821nok7YCL_HvFMxFU6DCp_zCvIEkvIGL0tQcJlaYWDgEfNec217-wdwYvL1TPZBJL0NVAjwpAMX-U4Km-Ho0JTM0TVriHiws9F-lNzPgoA1ull0N1aq8a1ASY71zcowc774WcI7nCKfQBSdizgcxmbTKP6lxuFC34fVFeQs6hD8RQYtmG1I7nW-Rr8wnejSzDyZGbRo5hmCT92Lu_iLIYMagSbf5khjAcvpbHesGz5q24SvzDnB2Ml06-hpUDgsgSK1_U3bJWpaicocq54C4gsf2PBUJXoreD0yLR3qrIR3BTKas93hju1e22wRTqX83hMSkXkbyme2GKkAqy8kxMPmZ7gbyiorT6dPK359XOv91amGYcEiIsZKUUABcQ3tp6Ffc7uKEz9NqAaXEaQb3TCesoQUhMjTbMcv3eNiv-LBkha6txbZCPpkCz27_DAtWMdFhw6HWtcubU7C4TC5P6CbGVfUFYo2u2Fu6uBqL6eAcivxmrgzhkduvFJ1CSIPBMuIuwFvcsy5rJn7fGDDwkC22CwIcgN20w-Z2Prv3h2lFryMhqdrGHpE2mlkEHLVPH9eWZOy35-Y4WA8FIRkNxnpJcMD7',
    };
    const formBody = [];
    for (const property in details) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(details[property]);
      formBody.push(encodedKey + '=' + encodedValue);
    }
    const body = formBody.join('&');

    try {
      // Send authentication request, store result in cache and return
      const res = await axios({
        url: settings.authTargetUrl,
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': `${body.length}`,
        },
        data: body,
      });
      console.log('token succesfully acquired');
      cache.set(tokenID, res.data.access_token, res.data.expires_in - 30);
      return res.data.access_token;
    } catch (error) {
      console.log(
        error.response.data.error_description,
        'error while getting token'
      );
    }
    return;
  }
  if (apiConfiguration.authType === authType.userToService) {
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
  const res = await axios({
    url: settings.authTargetUrl,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': `${body.length}`,
    },
    data: body,
  });
  cache.set(tokenID, res.data.access_token, res.data.expires_in - 30);
  return res.data.access_token;
};
