import { Record, Resource, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { hasInaccessibleFields } from './hasInaccessibleFields';

/**
 * Checks if the user can edit a record with the given data.
 *
 * A draft is a record being created: editing it is granted by the permission
 * to create records, to its author only. Field permissions are not checked,
 * as they are not when adding a record.
 * Any other record requires the permission to update it, and to update each
 * of the edited fields.
 *
 * @param record Edited record
 * @param newData Updated data
 * @param ability User ability on the records of the form of the record
 * @param resource Resource of the record
 * @param user Current user
 * @returns True if the user can edit the record
 */
export const canEditRecord = (
  record: Record,
  newData: any,
  ability: AppAbility,
  resource: Resource,
  user: User
): boolean => {
  if (record.draft) {
    return (
      ability.can('create', 'Record') &&
      !!user?._id &&
      !!record.createdBy?.user &&
      String(record.createdBy.user) === String(user._id)
    );
  }
  return (
    ability.can('update', record) &&
    !hasInaccessibleFields(record, newData, ability, resource)
  );
};

export default canEditRecord;
