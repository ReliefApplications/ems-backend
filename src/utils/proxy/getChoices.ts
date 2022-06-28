import fetch from 'node-fetch';
import get from 'lodash/get';

/**
 * Fetches the choices for a question field by URL
 *
 * @param field The question field
 * @param token The authorization token
 * @returns the choices
 */
export const getChoices = async (field: any, token: string): Promise<any[]> => {
  const value = field.choicesByUrl.value;
  const text = field.choicesByUrl.text;
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
    return choices
      ? choices.map((x: any) => ({
          value: value ? get(x, value) : x,
          text: text ? get(x, text) : value ? get(x, value) : x,
        }))
      : [];
  } catch {
    return [];
  }
};
