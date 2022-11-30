import { Record } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Filters data from a record according to the user's ability
 * keeps only fields the user has access to
 *
 * @param record Record to filter data from
 * @param ability User ability object
 * @returns Record with only accessible data
 */
const getAccessibleFieldsFromRecord = (record: Record, ability: AppAbility) => {
  const fields = Object.keys(record.data);
  const data = fields.reduce((acc, field) => {
    if (ability.can('read', record, `data.${field}`))
      Object.assign(acc, { [field]: record.data[field] });
    return acc;
  }, {});

  Object.assign(record, { data });

  // record.data = data;
  return record;
};

export function getAccessibleFields(
  element: Record,
  ability: AppAbility
): Record;

export function getAccessibleFields(
  element: Record[],
  ability: AppAbility
): Record[];

/**
 * Filters data from a (list of) record(s) according to the user's ability
 * keeps only fields the user has access to
 *
 * @param element Record/Records to filter data from
 * @param ability User ability object
 * @returns Record/Records with only accessible data
 */
export function getAccessibleFields(
  element: Record | Record[],
  ability: AppAbility
) {
  return Array.isArray(element)
    ? element.map((r) => getAccessibleFieldsFromRecord(r, ability))
    : getAccessibleFieldsFromRecord(element, ability);
}
