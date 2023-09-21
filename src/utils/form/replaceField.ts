import { getQuestion } from './getQuestion';
import { preserveChildProperties } from './preserveChildProperties';

/**
 * Check if the structure is correct and replace the chosen field by the corresponding one in the referenceStructure.
 * Function by induction.
 *
 * @param fieldName name of the field to search for
 * @param editedStructure structure of the form that will be edited
 * @param referenceStructure structure which should be used as a reference to change field value
 * @param prevReferenceStructure structure which represent the previous state of the reference structure
 * @returns {boolean} status of request
 */
export const replaceField = (
  fieldName: string,
  editedStructure: any,
  referenceStructure: any,
  prevReferenceStructure: any
): boolean => {
  // Loop on elements to find the right question
  if (editedStructure.pages) {
    for (const page of editedStructure.pages) {
      if (
        replaceField(
          fieldName,
          page,
          referenceStructure,
          prevReferenceStructure
        )
      )
        return true;
    }
  } else if (editedStructure.elements) {
    for (const elementIndex in editedStructure.elements) {
      const element = editedStructure.elements[elementIndex];
      if (element) {
        if (element.type === 'panel') {
          if (
            replaceField(
              fieldName,
              element,
              referenceStructure,
              prevReferenceStructure
            )
          )
            return true;
        } else {
          if (element.valueName === fieldName) {
            const referenceField = getQuestion(referenceStructure, fieldName);
            const prevReferenceField = getQuestion(
              prevReferenceStructure,
              fieldName
            );
            // If the edited structure's field has different properties than
            // the previous version of the reference structure's field's
            const preserveChild = preserveChildProperties(
              referenceField,
              prevReferenceField,
              element
            );
            if (preserveChild.preserve) {
              // Copy the reference structure's field into the edited structure's field,
              // except for the properties it must preserve
              editedStructure.elements[elementIndex] = preserveChild.field;
            } else {
              // Completely replace the edited structure's field by the reference structure's field
              editedStructure.elements[elementIndex] = referenceField;
            }
            return true;
          }
        }
      }
    }
  }
};
