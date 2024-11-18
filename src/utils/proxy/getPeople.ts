import axios from 'axios';
import { getToken } from './authManagement';
import { commonServicesConfig } from '@routes/proxy';
import { isArray } from 'lodash';

/**
 *  Generate a filter to only fetch users we need
 *
 * @param people list of people
 * @returns the filter to get people
 */
export const getPeopleFilter = (people: string[] | string) => {
  people = isArray(people) ? people : [people];
  const formattedFilter = `{
userid_in:
[${people.map((el) => `"${el}"`)}]
}`;
  return formattedFilter.replace(/\s/g, '');
};

/**
 * Fetches the people
 *
 * @param accessToken The authorization token
 * @param filter The filter used for fetching the distant users
 * @param offset offset to query users
 * @param limitItems number of maximum items to fetch
 * @returns the choices
 */
export const getPeople = async (
  accessToken: string,
  filter: any,
  offset = 0,
  limitItems = null
): Promise<any[]> => {
  const query = `query {
    users(
      filter: ${filter}
      offset: ${offset}
      ${limitItems ? `limitItems: ${limitItems}` : ''}
    ) {
      userid
      firstname
      lastname
      emailaddress
    }
  }`;
  try {
    const token = await getToken(commonServicesConfig, accessToken);
    let people: any[] = [];
    await axios({
      url: `${commonServicesConfig.endpoint}/graphql`,
      method: 'post',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        query: query,
      },
    }).then(({ data }) => {
      people = data?.data?.users;
    });
    return people;
  } catch {
    return [];
  }
};
