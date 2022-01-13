/**
 * Gets the previous question, from a question name.
 *
 * @param structure parent structure.
 * @param name question name.
 * @returns Previous question if exists.
 */
export const getPreviousQuestion = (structure: any, name: string): any => {
  if (structure.pages) {
    for (const page of structure.pages) {
      const question = getPreviousQuestion(page, name);
      if (question) return question;
    }
  } else if (structure.elements) {
    for (const elementIndex in structure.elements) {
      const element = structure.elements[elementIndex];
      if (element.type === 'panel') {
        if (element.name === name) return element;
        const question = getPreviousQuestion(element, name);
        if (question) return question;
      } else {
        if (element.valueName === name) {
          // Return previous question
          if (Number(elementIndex) - 1 >= 0) {
            return structure.elements[Number(elementIndex) - 1];
          } else {
            return null;
          }
        }
      }
    }
  }
};
