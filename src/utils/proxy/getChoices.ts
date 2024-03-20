import fetch from 'node-fetch';
import get from 'lodash/get';
import axios from 'axios';
import jsonpath from 'jsonpath';

/**
 * Fetches the choices for a question field by URL
 *
 * @param field The question field
 * @param token The authorization token
 * @returns the choices
 */
export const getChoices = async (field: any, token: string): Promise<any[]> => {
  if (field.choicesByUrl) {
    const valueField = get(field, 'choicesByUrl.value', null);
    const textField = get(field, 'choicesByUrl.text', null);
    try {
      const res = await fetch(field.choicesByUrl.url, {
        method: 'get',
        headers: {
          Authorization: token,
        },
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
    const valueField = get(field, 'choicesByGraphQL.value', null);
    const textField = get(field, 'choicesByGraphQL.text', null);
    const url = get(field, 'choicesByGraphQL.url', null);
    try {
      let choices: any[] = [];
      await axios({
        url,
        method: 'post',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
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
