/** Name of the owner field type */
const OWNER_FIELD_TYPE = 'owner';

/** The owner interface definition */
interface Owner {
  roles?: string[];
  positionAttributes?: { value: string; category: string }[];
}

/**
 * Check if the parent form has an owner field, check if this field is filled. Then fill createdBy properties using this field.
 *
 * @param fields fields of the parent form
 * @param data data passed to edit the record
 * @returns Roles that own the record, if any.
 */
export const getOwnership = (fields: any, data: any): Owner => {
  const ownership: Owner = {};
  const ownerField = fields.find((x) => x.type === OWNER_FIELD_TYPE);
  if (ownerField && data[ownerField.name]) {
    ownership.roles = data[ownerField.name];
    return ownership;
  } else {
    return null;
  }
};
