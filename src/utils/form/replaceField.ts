import { getQuestion } from './getQuestion';

/**
 * Check if the structure is correct and replace the passed field with the corresponding one from the passed structure.
 * Function by induction.
 * @param structure structure of the form to edit
 * @param name name of the field to search for
 * @param template 
 * @returns 
 */
export const replaceField = (structure: any, name: string, template: any): boolean => {
  // Loop on elements to find the right question
  if (structure.pages) {
    for (const page of structure.pages) {
      if (replaceField(page, name, template)) return true;
    }
  } else if (structure.elements) {
    for (const elementIndex in structure.elements) {
      const element = structure.elements[elementIndex];
      if (element.type === 'panel') {
        if (replaceField(element, name, template)) return true;
      } else {
        if (element.valueName === name) {
          // Replace the field
          structure.elements[elementIndex] = getQuestion(template, name);
          return true;
        }
      }
    }
  }
};
