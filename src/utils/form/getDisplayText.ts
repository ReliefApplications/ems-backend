import { Context } from '../../server/apollo/context';
import { CustomAPI } from '../../server/apollo/dataSources';
import config from 'config';
import { logger } from '@services/logger.service';
import axios from 'axios';
import get from 'lodash/get';
import jsonpath from 'jsonpath';
import { getPeople, getPeopleFilter } from '@utils/proxy';

/**
 * Gets display text from choice value.
 *
 * @param choices list of choices.
 * @param value choice value.
 * @returns display value of the value.
 */
export const getText = (choices: any[], value: any): string => {
  if (value) {
    const choice = choices.find((x) =>
      x.value
        ? x.value.toString() === value.toString()
        : x.toString() === value.toString()
    );
    if (choice != null) {
      if (choice.text) {
        if (choice.text.default) {
          return choice.text.default;
        }
        return choice.text;
      }
      return choice;
    }
  }
  return value;
};

/**
 * Gets the choice list of a field, using GraphQL data source mechanism.
 *
 * @param field field to get value of.
 * @param context provides the data sources context.
 * @param peopleIds ids of people to fetch
 * @returns Choice list of the field.
 */
export const getFullChoices = async (
  field: any,
  context: Context,
  peopleIds?: string[] | string
): Promise<{ value: string; text: string }[] | string[]> => {
  try {
    if (field.choicesByUrl) {
      const url: string = field.choicesByUrl.url;
      if (url.includes(config.get('server.url')) || url.includes('{API_URL}')) {
        const ownUrl: string = url.includes(config.get('server.url'))
          ? config.get('server.url')
          : '{API_URL}';
        const endpointArray: string[] = url
          .substring(url.indexOf(ownUrl) + ownUrl.length + 1)
          .split('/');
        const apiName: string = endpointArray[1]; // first one should be 'proxy'
        const endpoint: string = endpointArray.slice(2).join('/'); // second one should be api name so we start after
        const dataSource: CustomAPI = context.dataSources[apiName];
        if (dataSource) {
          const res = await dataSource.getChoices(
            endpoint,
            field.choicesByUrl.path,
            field.choicesByUrl.value,
            field.choicesByUrl.text,
            field.choicesByUrl.hasOther
          );
          return res;
        }
      } else {
        const dataSource: CustomAPI = context.dataSources._rest;
        const res = await dataSource.getChoices(
          url,
          field.choicesByUrl.path,
          field.choicesByUrl.value,
          field.choicesByUrl.text,
          field.choicesByUrl.hasOther
        );
        if (res.length) {
          return res;
        }
      }
    } else if (field.choicesByGraphQL) {
      const url: string = field.choicesByGraphQL.url;
      let choices: any[] = [];
      const valueField = get(field, 'choicesByGraphQL.value', null);
      const textField = get(field, 'choicesByGraphQL.text', null);
      await axios({
        url,
        method: 'post',
        headers: {
          Authorization: context.token,
          'Content-Type': 'application/json',
          ...(context.accesstoken && {
            accesstoken: context.accesstoken,
          }),
        },
        data: {
          query: field.choicesByGraphQL.query,
        },
      }).then(({ data }) => {
        choices = jsonpath
          .query(data, get(field, 'choicesByGraphQL.path'))
          .map((x) => ({
            value: get(x, valueField),
            text: get(x, textField),
          }));
      });
      if (field.choicesByGraphQL.hasOther) {
        choices.push({ [valueField]: 'other', [textField]: 'Other' });
      }
      return choices;
    } else if (['people', 'singlepeople'].includes(field.type)) {
      // Generate a filter to only fetch users we need
      const filter = getPeopleFilter(peopleIds);
      const people = await getPeople(context.token, filter);
      if (!people) {
        return [];
      }
      return people.map((x: any) => {
        const fullname =
          x.firstname && x.lastname
            ? `${x.firstname}, ${x.lastname}`
            : x.firstname || x.lastname;
        return {
          text: `${fullname} (${x.emailaddress})`,
          value: x.userid,
        };
      });
    } else {
      return field.choices;
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return field.choices;
  }
};

/**
 * Gets display text of a record field, matching the value with the choices list.
 *
 * @param field field to get value of.
 * @param value current field value.
 * @param context provides the data sources context.
 * @returns Display value of the field value.
 */
const getDisplayText = async (
  field: any,
  value: any,
  context: Context
): Promise<string | string[]> => {
  const choices: { value: string; text: string }[] | string[] =
    await getFullChoices(field, context, [value]);
  if (choices && choices.length) {
    if (Array.isArray(value)) {
      return value.map((x) => getText(choices, x));
    } else {
      return getText(choices, value);
    }
  }
  return value;
};

export default getDisplayText;
