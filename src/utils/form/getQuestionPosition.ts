/**
 * Gets the question position in a structure, from a question name.
 *
 * @param structure parent structure.
 * @param name question name.
 * @returns parent structure and index of the question in it.
 */
export const getQuestionPosition = (structure: any, name: string): any => {
  // Loop on elements to find the right question
  if (structure.pages) {
    for (const page of structure.pages) {
      const questionPosition = getQuestionPosition(page, name);
      if (questionPosition && questionPosition.parent) return questionPosition;
    }
  } else if (structure.elements) {
    for (const elementIndex in structure.elements) {
      const element = structure.elements[elementIndex];
      if (element.type === 'panel') {
        if (element.name === name)
          return { parent: structure, index: Number(elementIndex) };
        const questionPosition = getQuestionPosition(element, name);
        if (questionPosition && questionPosition.parent)
          return questionPosition;
      } else {
        if (element.valueName === name) {
          // Return question
          return { parent: structure, index: Number(elementIndex) };
        }
      }
    }
  }
};
