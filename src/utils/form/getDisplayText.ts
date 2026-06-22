import { Context } from '../../server/apollo/context';
import { CustomAPI } from '../../server/apollo/dataSources';
import config from 'config';
import { logger } from '@services/logger.service';
import axios, { AxiosHeaders, AxiosStatic } from 'axios';
import get from 'lodash/get';
import { JSONPath } from 'jsonpath-plus';
import commonServices from '@server/common-services';
import { AxiosCacheInstance } from 'axios-cache-interceptor';

export type Choice =
  | string
  | number
  | boolean
  | {
      value?: unknown;
      text?: unknown;
      [key: string]: unknown;
    };

/** Default language used when no locale is provided. */
const DEFAULT_LANGUAGE = 'en';

/**
 * Gets the stored value represented by a choice definition.
 *
 * @param choice Choice definition.
 * @returns Stored value of the choice.
 */
const getChoiceValue = (choice: Choice): unknown => {
  if (choice && typeof choice === 'object' && 'value' in choice) {
    return choice.value;
  }
  return choice;
};

/**
 * Gets the localized label from a SurveyJS choice text object.
 *
 * @param text Choice text or localized text map.
 * @param locale Requested application locale.
 * @param fallback Fallback value when no label is available.
 * @returns Localized choice label.
 */
export const getLocalizedText = (
  text: unknown,
  locale?: string,
  fallback?: unknown
): unknown => {
  if (!text || typeof text !== 'object') {
    return text ?? fallback;
  }

  const normalizedLocale = locale?.replace('-', '_') || DEFAULT_LANGUAGE;
  const baseLanguage = normalizedLocale.split('_')[0];
  const candidates = [
    normalizedLocale,
    normalizedLocale.replace('_', '-'),
    baseLanguage,
    'default',
    DEFAULT_LANGUAGE,
  ];

  const localizedText = text as Record<string, unknown>;
  for (const key of candidates) {
    const value = localizedText[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return fallback;
};

/**
 * Localizes static choices without changing their stored values.
 *
 * @param choices Choice definitions.
 * @param locale Requested application locale.
 * @returns Choices with localized text.
 */
export const getLocalizedChoices = (
  choices: Choice[] = [],
  locale?: string
): Choice[] =>
  choices.map((choice) => {
    if (choice && typeof choice === 'object' && 'text' in choice) {
      const value = getChoiceValue(choice);
      return {
        ...choice,
        text: getLocalizedText(choice.text, locale, value),
      };
    }
    return choice;
  });

/**
 * Gets display text from choice value.
 *
 * @param choices list of choices.
 * @param value choice value.
 * @param locale Requested application locale.
 * @returns display value of the value.
 */
export const getText = (
  choices: Choice[],
  value: unknown,
  locale?: string,
  localize = true
): unknown => {
  if (value !== undefined && value !== null && value !== '') {
    const choice = choices.find((x) => {
      const choiceValue = getChoiceValue(x);
      return choiceValue?.toString() === value.toString();
    });
    if (choice != null) {
      if (typeof choice === 'object' && 'text' in choice) {
        if (localize) {
          return getLocalizedText(choice.text, locale, getChoiceValue(choice));
        }
        const text = choice.text as { default?: unknown } | unknown;
        return text && typeof text === 'object' && 'default' in text
          ? (text as { default?: unknown }).default
          : text;
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
 * @returns Choice list of the field.
 */
export const getFullChoices = async (
  field: any,
  context: Context
): Promise<Choice[]> => {
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
      } else if (
        config.get('commonServices.url') &&
        url.includes(config.get('commonServices.url'))
      ) {
        let choices: any[] = [];
        const valueField = get(field, 'choicesByUrl.value', null);
        const textField = get(field, 'choicesByUrl.text', null);
        await axios({
          url,
          method: 'get',
          headers: {
            Authorization: `Bearer ${context.accesstoken}`,
            'Content-Type': 'application/json',
          },
        }).then(({ data }) => {
          const path = field.choicesByUrl.path;
          choices = path ? [...get(data, path)] : [...data];
          if (field.choicesByUrl.hasOther) {
            choices.push({ [valueField]: 'other', [textField]: 'Other' });
          }
          return choices
            ? choices.map((x: any) => ({
                value: String(valueField ? get(x, valueField) : x),
                text: String(
                  textField
                    ? get(x, textField)
                    : valueField
                    ? get(x, valueField)
                    : x
                ),
              }))
            : [];
        });
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
      let sender: AxiosCacheInstance | AxiosStatic = axios;
      const url: string = field.choicesByGraphQL.url;
      let choices: any[] = [];
      const valueField = get(field, 'choicesByGraphQL.value', null);
      const textField = get(field, 'choicesByGraphQL.text', null);
      const headers = new AxiosHeaders({
        'Content-Type': 'application/json',
      });
      if (
        config.get('commonServices.url') &&
        url.includes(config.get('commonServices.url'))
      ) {
        headers.setAuthorization(`Bearer ${context.accesstoken}`);
        sender = commonServices();
      } else {
        headers.setAuthorization(context.token);
        if (context.accesstoken) {
          headers.set('accesstoken', context.accesstoken);
        }
      }
      await sender({
        url,
        method: 'post',
        headers,
        data: {
          query: field.choicesByGraphQL.query,
        },
      }).then(({ data }) => {
        choices = JSONPath({
          path: get(field, 'choicesByGraphQL.path'),
          json: data,
          wrap: true,
        }).map((x) => ({
          value: get(x, valueField),
          text: get(x, textField),
        }));
      });
      if (field.choicesByGraphQL.hasOther) {
        choices.push({ [valueField]: 'other', [textField]: 'Other' });
      }
      return choices;
    } else {
      return getLocalizedChoices(field.choices, context?.locale);
    }
  } catch (err) {
    logger.error(err.message, { stack: err.stack });
    return getLocalizedChoices(field.choices, context?.locale);
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
): Promise<unknown | unknown[]> => {
  const choices = await getFullChoices(field, context);
  const localizeStaticChoices = Boolean(field.choices);
  if (choices && choices.length) {
    if (Array.isArray(value)) {
      return value.map((x) =>
        getText(choices, x, context?.locale, localizeStaticChoices)
      );
    } else {
      return getText(choices, value, context?.locale, localizeStaticChoices);
    }
  }
  return value;
};

export default getDisplayText;
