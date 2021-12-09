import { Context } from '../../server/apollo/context';
import { CustomAPI } from '../../server/apollo/dataSources';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Gets display text from choice value.
 * @param choices list of choices.
 * @param value choice value.
 * @returns display value of the value.
 */
export const getText = (choices: any[], value: any): string => {
  if (value) {
    const choice = choices.find(x => x.value ? x.value.toString() === value.toString() : x.toString() === value.toString());
    if (choice && choice.text) {
      return choice.text;
    }
  }
  return value;
};

/**
 * Gets display text of a record field, using GraphQL data source mechanism.
 * @param field field to get value of.
 * @param value current field value.
 * @param context provides the data sources context.
 * @returns Display value of the field value.
 */
const getDisplayText = async (field: any, value: any, context: Context): Promise<string | string[]> => {
  let choices: any[] = field.choices;
  if (field.choicesByUrl) {
    const url: string = field.choicesByUrl.url;
    if (url.includes(process.env.OWN_URL) || url.includes('{API_URL}')) {
      const ownUrl: string = url.includes(process.env.OWN_URL) ? process.env.OWN_URL : '{API_URL}';
      const endpointArray: string[] = url.substring(url.indexOf(ownUrl) + ownUrl.length + 1).split('/');
      const apiName: string = endpointArray.shift();
      const endpoint: string = endpointArray.join('/');
      const dataSource: CustomAPI = context.dataSources[apiName];
      if (dataSource) {
        choices = await dataSource.getChoices(endpoint, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
      }
    } else {
      const dataSource: CustomAPI = context.dataSources._rest;
      const res = await dataSource.getChoices(url, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
      if (res.length) {
        choices = res;
      }
    }
  }
  if (choices && choices.length) {
    if (Array.isArray(value)) {
      return value.map(x => getText(choices, x));
    } else {
      return getText(choices, value);
    }
  }
  return value;
};

export default getDisplayText;
