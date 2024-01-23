import redis from '../../server/redis';
import { logger } from '@services/logger.service';
import axios from 'axios';
import config from 'config';
import { parse } from 'wellknown';
import { simplify } from '@turf/turf';

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
      maxRedirects: 35,
      data: body,
    })
  ).data.access_token;
};

/**
 * Get country polygons from common services.
 *
 * @returns mapping of polygons
 */
export const getAdmin0Polygons = async () => {
  const cacheKey = 'admin0:polygons';
  const client = await redis();
  const cacheData = client ? await client.get(cacheKey) : null;
  let admin0s: any[] = [];
  if (!cacheData) {
    const token = await getToken();
    admin0s = await axios({
      url: 'https://ems-safe-dev.who.int/csapi/api/graphql/',
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
              name
              centerlatitude
              centerlongitude
              polygons
            }
          }
        `,
      },
    })
      .then(({ data }) => {
        const mapping = [];
        for (const country of data.data.countrys) {
          if (country.polygons) {
            try {
              mapping.push({
                ...country,
                polygons: simplify(parse(country.polygons), {
                  tolerance: 0.1,
                  highQuality: true,
                  mutate: true,
                }),
              });
            } catch (err) {
              logger.error(
                `Failed to fetch admin0s for country ${country.iso3code}: ${err.message}`
              );
            }
          }
        }
        if (client) {
          client.set(cacheKey, JSON.stringify(mapping), {
            EX: 60 * 60 * 1, // set a cache of one hour
          });
        }
        return mapping;
      })
      .catch((err) => {
        logger.error(`Failed to fetch admin0s: ${err.message}`);
        return [];
      });
  } else {
    admin0s = JSON.parse(cacheData);
  }
  return admin0s;
};
