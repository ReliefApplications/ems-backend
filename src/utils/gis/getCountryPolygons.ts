import { logger } from '@services/logger.service';
import axios from 'axios';
import config from 'config';
import { set } from 'lodash';
import { RedisClientType, createClient } from 'redis';
import { parse } from 'wellknown';

/**
 * Get token for common services API.
 *
 * @returns token
 */
export const getToken = async () => {
  const details: any = {
    grant_type: 'client_credentials',
    client_id: config.get('commonServices.clientId'),
    client_secret: config.get('commonServices.clientSecret'),
    scope: config.get('commonServices.scope'),
  };
  const formBody = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  const body = formBody.join('&');
  return (
    await axios({
      url: 'https://login.microsoftonline.com/f610c0b7-bd24-4b39-810b-3dc280afb590/oauth2/v2.0/token',
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': `${body.length}`,
      },
      data: body,
    })
  ).data.access_token;
};

// todo: automatically from amdin0
/** Admin identifiers */
type AdminIdentifier = 'admin0.iso2code' | 'admin0.iso3code' | 'admin0.id';

/** Admin 0 available identifiers */
type Admin0Identifier = 'iso2code' | 'iso3code' | 'id';

/**
 * Get country polygons from common services.
 *
 * @param identifier admin 0 identifier
 * @returns mapping of polygons
 */
export const getAdmin0Polygons = async (
  identifier: Admin0Identifier = 'iso3code'
) => {
  const cacheKey = 'admin0:polygons';
  let client: RedisClientType;
  if (config.get('redis.url')) {
    client = createClient({
      url: config.get('redis.url'),
      password: config.get('redis.password'),
    });
    client.on('error', (error) => {
      logger.error(`REDIS: ${error}`);
    });
    await client.connect();
  }
  const cacheData = client ? await client.get(cacheKey) : null;
  let admin0s: any[] = [];
  const mapping = {};
  if (!cacheData) {
    const token = await getToken();
    admin0s = await axios({
      url: config.get('commonServices.url'),
      method: 'post',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // todo: do filtering based on iso?
      data: {
        query: `
          query {
            countrys {
              id
              iso3code
              iso2code
              polygons
            }
          }
        `,
      },
    })
      .then(({ data }) => {
        if (client) {
          client.set(cacheKey, JSON.stringify(data.data.countrys), {
            EX: 60 * 60 * 1, // set a cache of one hour
          });
        }
        return data.data.countrys;
      })
      .catch((err) => {
        logger.error(err.message);
        return [];
      });
  } else {
    admin0s = JSON.parse(cacheData);
  }
  for (const country of admin0s) {
    if (country.polygons && country[identifier]) {
      set(mapping, country[identifier].toLowerCase(), parse(country.polygons));
    }
  }
  return mapping;
};

/**
 * Get polygons from common services.
 *
 * @param identifier admin 0 identifier
 * @returns mapping of polygons.
 */
export const getPolygons = async (
  identifier: AdminIdentifier = 'admin0.iso3code'
) => {
  if (identifier.startsWith('admin0.')) {
    const countryPolygons = await getAdmin0Polygons(
      identifier.replace('admin0.', '') as Admin0Identifier
    );
    return countryPolygons;
  }
  return {};
};
