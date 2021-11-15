import { CustomAPI } from '../../server/apollo/dataSources';

/**
 * Gets display text from choice value.
 * @param choices list of choices.
 * @param value choice value.
 * @returns display value of the value.
 */
const getText = (choices: any[], value: any): string => {
  const choice = choices.find(x => x.value ? x.value === value : x === value);
  if (choice && choice.text) {
    return choice.text;
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
const getDisplayText = async (field: any, value: any, context: any): Promise<string | string[]> => {
  let choices: any[] = field.choices;
  if (field.choicesByUrl) {
    const url: string = field.choicesByUrl.url;
    if (url.includes('http://localhost:3000/') || url.includes('{SAFE_API}')) {
      const safeURL: string = url.includes('http://localhost:3000/') ? 'http://localhost:3000/' : '{SAFE_API}';
      const endpointArray: string[] = url.substring(url.indexOf(safeURL) + safeURL.length).split('/');
      const apiName: string = endpointArray.shift();
      const endpoint: string = endpointArray.join('/');
      const dataSource: CustomAPI = context.dataSources[apiName];
      if (dataSource) {
        choices = await dataSource.getChoices(endpoint, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
      }
    } else {
      const dataSource: CustomAPI = context.dataSources._rest;
      choices = await dataSource.getChoices(url, field.choicesByUrl.path, field.choicesByUrl.value, field.choicesByUrl.text);
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
