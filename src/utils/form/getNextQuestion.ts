/**
 * Gets the next question, from a question name.
 *
 * @param structure parent structure.
 * @param name question name.
 * @returns next question if exists.
 */
export const getNextQuestion = (structure: any, name: string): any => {
  if (structure.pages) {
    for (const page of structure.pages) {
      const question = getNextQuestion(page, name);
      if (question) return question;
    }
  } else if (structure.elements) {
    for (const elementIndex in structure.elements) {
      const element = structure.elements[elementIndex];
      if (element.type === 'panel') {
        if (element.name === name) return element;
        const question = getNextQuestion(element, name);
        if (question) return question;
      } else {
        if (element.valueName === name) {
          // Return previous question
          if (Number(elementIndex) + 1 < structure.elements.length) {
            return structure.elements[Number(elementIndex) + 1];
          } else {
            return null;
          }
        }
      }
    }
  }
};
