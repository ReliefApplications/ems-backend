import { Record, Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { filter, isEqual, keys, union, has, get } from 'lodash';

/**
 * Checks if the user has the permission to update all the fields they're trying to update
 *
 * @param record Edited record
 * @param newData Updated data
 * @param ability User ability
 * @param resource Resource associated to the record
 * @returns True if the user is trying to update fields they don't have access to, false otherwise
 */
export const hasInaccessibleFields = (
  record: Record,
  newData: any,
  ability: AppAbility,
  resource: Resource
) => {
  const fields = resource.fields || []; // Resource fields define the list of possible fields, anything outside of this should be ignored
  const oldData = record.data || {};
  const allKeys = union(keys(oldData), keys(newData)).filter((key) =>
    fields.find((f) => f.name === key)
  );
  const updatedKeys = filter(allKeys, (key) => {
    let previous = get(oldData, key);
    let next = get(newData, key);

    // check for date objects and convert them to strings
    if (previous instanceof Date) previous = previous.toISOString();
    if (next instanceof Date) next = next.toISOString();

    return !isEqual(previous, next);
  });

  return updatedKeys.some(
    (question) =>
      ability.cannot('update', record, `data.${question}`) &&
      has(newData, question)
  );
};

export default hasInaccessibleFields;
