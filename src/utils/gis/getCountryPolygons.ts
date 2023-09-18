import axios from 'axios';
import config from 'config';
import { set } from 'lodash';
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

/**
 * Get country polygons from common services.
 *
 * @returns mapping of polygons
 */
export const getCountryPolygons = async () => {
  const token = await getToken();
  const mapping = {};
  return axios({
    url: 'https://portal-test.who.int/ems-core-api-dev/api/graphql',
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
      for (const country of data.data.countrys) {
        if (country.polygons && country.iso2code) {
          set(mapping, country.iso2code, parse(country.polygons));
        }
      }
      return mapping;
    })
    .catch((error) => {
      console.log(error.message);
      return {};
    });
};

/**
 * Get polygons from common services.
 *
 * @returns mapping of polygons.
 */
export const getPolygons = async () => {
  const countryPolygons = await getCountryPolygons();
  return countryPolygons;
};
