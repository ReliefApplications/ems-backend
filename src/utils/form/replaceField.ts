import { getQuestion } from './getQuestion';
import isEqual from 'lodash/isEqual';

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
            // If the edited structure's field has a defaultValue, and this defaultValue
            // isn't equal to the previous version of the reference structure's field's defaultValue
            if (
              element.hasOwnProperty('defaultValue') &&
              !isEqual(element.defaultValue, prevReferenceField?.defaultValue)
            ) {
              // Copy the reference structure's field into the edited structure's field, except for its defaultValue
              editedStructure.elements[elementIndex] = {
                ...referenceField,
                defaultValue: element.defaultValue,
              };
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
