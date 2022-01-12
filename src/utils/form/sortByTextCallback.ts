import { Record } from '../../models';
import { getText } from './getDisplayText';

/**
 * Sort method for sorting by a choicesByUrl field.
 * @param choices list of key / text choices
 * @param sortField name of field
 * @param sortOrder sort order
 * @returns sort result
 */
export const sortByTextCallback = (choices: any[], sortField: string, sortOrder: string) => {
  return (itemA: Record, itemB: Record): number => {
    let res = 0;
    const valueA = itemA.data[sortField];
    const valueB = itemB.data[sortField];
    if (Array.isArray(valueA) || Array.isArray(valueB)) {
      const textA = valueA ? valueA.map(x => getText(choices, x)).sort() : [null];
      const textB = valueB ? valueB.map(x => getText(choices, x)).sort() : [null];
      if (sortOrder === 'asc') {
        const minA = textA[0];
        const minB = textB[0];
        if (!minA && minB) res = -1;
        if (minA && !minB) res = 1;
        if (minA < minB) res = -1;
        if (minA > minB) res = 1;
      } else {
        const maxA = textA[textA.length - 1];
        const maxB = textB[textB.length - 1];
        if (!maxA && maxB) res = 1;
        if (maxA && !maxB) res = -1;
        if (maxA < maxB) res = 1;
        if (maxA > maxB) res = -1;
      }
    } else {
      const textA = getText(choices, valueA);
      const textB = getText(choices, valueB);
      if (!textA && textB) res = -1;
      if (textA && !textB) res = 1;
      if (textA < textB) res = -1;
      if (textA > textB) res = 1;
      if (sortOrder === 'desc') {
        res = -res;
      }
    }
    return res;
  };
};
