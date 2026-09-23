import { getQuestion } from './getQuestion';
import isEqual from 'lodash/isEqual';

/**
 * Question properties a child form can set on a core field. A child value
 * survives a core form save when it differs from the previous core value
 * ( i.e. it was customized on the child ); otherwise it follows the core.
 */
const CHILD_OVERRIDABLE_PROPERTIES = ['defaultValue', 'showOutdatedFiles'];

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
            // Replace the edited structure's field by the reference structure's
            // field, keeping the properties customized on the edited structure
            // ( set, and different from the previous version of the reference
            // structure's field )
            const overrides = CHILD_OVERRIDABLE_PROPERTIES.filter(
              (property) =>
                element.hasOwnProperty(property) &&
                !isEqual(element[property], prevReferenceField?.[property])
            );
            editedStructure.elements[elementIndex] =
              overrides.length > 0
                ? {
                    ...referenceField,
                    ...Object.fromEntries(
                      overrides.map((property) => [property, element[property]])
                    ),
                  }
                : referenceField;
            return true;
          }
        }
      }
    }
  }
};
