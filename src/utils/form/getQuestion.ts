/**
 * Based on the passed field, find the corresponfing question in a structure and return it.
 * Function by induction.
 *
 * @param structure structure of the form to search on
 * @param name name of the field to search for
 * @returns question definition
 */
export const getQuestion = (structure: any, name: string): any => {
  // Loop on elements to find the right question
  if (structure.pages) {
    for (const page of structure.pages) {
      const question = getQuestion(page, name);
      if (question) return question;
    }
  } else if (structure.elements) {
    for (const elementIndex in structure.elements) {
      const element = structure.elements[elementIndex];
      if (element.type === 'panel') {
        if (element.name === name) return element;
        const question = getQuestion(element, name);
        if (question) return question;
      } else {
        if (element.valueName === name) {
          // Return question
          return element;
        }
      }
    }
  }
};
