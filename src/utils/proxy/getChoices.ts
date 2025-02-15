import fetch from 'node-fetch';
import get from 'lodash/get';
import jsonpath from 'jsonpath';
import axios, { AxiosHeaders } from 'axios';
import config from 'config';
import { Request } from 'express';

/**
 * Fetches the choices for a question field by URL
 *
 * @param req Express request
 * @param field Question definition
 * @returns the choices
 */
export const getChoices = async (req: Request, field: any): Promise<any[]> => {
  const headers = new AxiosHeaders({
    'Content-Type': 'application/json',
  });
  if (field.choicesByUrl) {
    const url = field.choicesByUrl.url;
    const valueField = get(field, 'choicesByUrl.value', null);
    const textField = get(field, 'choicesByUrl.text', null);
    if (
      config.get('commonServices.url') &&
      url.includes(config.get('commonServices.url'))
    ) {
      headers.setAuthorization(`Bearer ${req.headers.accesstoken}`);
    } else {
      headers.setAuthorization(req.headers.authorization);
      if (req.headers.accesstoken) {
        headers.set('accesstoken', req.headers.accesstoken);
      }
    }
    try {
      const res = await fetch(url, {
        method: 'get',
        headers,
      });
      const json = await res.json();
      const choices = field.choicesByUrl.path
        ? [...get(json, field.choicesByUrl.path)]
        : [...json];
      return (
        choices
          ? choices.map((x: any) => ({
              value: valueField ? get(x, valueField) : x,
              text: textField
                ? get(x, textField)
                : valueField
                ? get(x, valueField)
                : x,
            }))
          : []
      ).sort((a, b) => {
        const textA = a.text || '';
        const textB = b.text || '';
        return textA.localeCompare(textB);
      });
    } catch {
      return [];
    }
  } else {
    const url = get(field, 'choicesByGraphQL.url', null);
    const valueField = get(field, 'choicesByGraphQL.value', null);
    const textField = get(field, 'choicesByGraphQL.text', null);
    if (
      config.get('commonServices.url') &&
      url.includes(config.get('commonServices.url'))
    ) {
      headers.setAuthorization(`Bearer ${req.headers.accesstoken}`);
    } else {
      headers.setAuthorization(req.headers.authorization);
      if (req.headers.accesstoken) {
        headers.set('accesstoken', req.headers.accesstoken);
      }
    }
    try {
      let choices: any[] = [];
      await axios({
        url,
        method: 'post',
        headers,
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
      return choices.sort((a, b) => {
        const textA = a.text || '';
        const textB = b.text || '';
        return textA.localeCompare(textB);
      });
    } catch {
      return [];
    }
  }
};
