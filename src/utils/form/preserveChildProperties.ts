import { isEqual } from 'lodash';

/**
 * List of questions boolean properties that shouldn't be overwritten by updates in the parent form.
 */
const propertiesToPreserve = [
  'visible', // default value is true
  'readOnly', // default value is false
  'isRequired', // default value is false
];

/**
 * Checks if a child form possesses properties that must be preserved
 * ("defaultValue" and the ones listed in the propertiesToPreserve above)
 * by checking if the previous version of the  parent form structure field (oldField)
 * has different properties values than the child form's structure (childField),
 * and these will not be overwritten by updates in the parent form.
 *
 * @param newField parent form updated field
 * @param oldField parent form old field saved on child previously
 * @param childField child field
 * @returns boolean indicating whether to preserve any child property value and the field updated
 */
export const preserveChildProperties = (
  newField: any,
  oldField: any,
  childField: any
): { preserve: boolean; field: any } => {
  let preserve = false;
  // If the child has its own "defaultValue" property
  if (
    childField.hasOwnProperty('defaultValue') &&
    !isEqual(childField.defaultValue, oldField?.defaultValue)
  ) {
    // Replace child's field by parent's field with child's field defaultValue's value
    newField = { ...newField, defaultValue: childField.defaultValue };
    preserve = true;
  }
  // Properties where the value can be true or false, don't appear in the field
  // if it's value is the default value (unless it is being updated),
  // so the hasOwnProperty doesn't always work correctly
  propertiesToPreserve.forEach((property: string) => {
    // If the child has its own property
    if (!isEqual(childField?.[property], oldField?.[property])) {
      // Replace child's field by parent's field with child's field property's value
      newField = { ...newField, [property]: childField[property] };
      preserve = true;
    }
  });

  return { preserve, field: newField };
};
