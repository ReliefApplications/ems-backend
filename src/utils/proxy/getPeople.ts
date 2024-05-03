import axios from 'axios';

/**
 * Fetches the people
 *
 * @param token The authorization token
 * @param filter The filter used for fetching the distant users
 * @param offset offset to query users
 * @param limitItems number of maximum items to fetch
 * @returns the choices
 */
export const getPeople = async (
  token: string,
  filter: any,
  offset = 0,
  limitItems = null
): Promise<any[]> => {
  const url = 'http://localhost:3000/proxy/common-services/graphql';
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
    let people: any[] = [];
    await axios({
      url,
      method: 'post',
      headers: {
        Authorization: token,
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
