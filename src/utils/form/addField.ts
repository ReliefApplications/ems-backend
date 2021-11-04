import { getQuestion } from './getQuestion';

/**
 * Check if the structure is correct and add a new field. Use a passed structure to fetch the correct question.
 * The method tries to put the new question at the same place than in the template.
 * Function by induction.
 * @param structure structure of the form to edit
 * @param name name of the field to search for
 * @param template structure of the core template
 */
export const addField = (structure: any, name: string, template: any): void => {
  let prevQuestion = '';
  let isFirstQuestion = false;
  let pageIndex = 0;

  // Find in the template the previous question name
  template.pages.forEach((page, pIndex) => page.elements.findIndex((el, qIndex) => {
    if (el.name === name) {
      isFirstQuestion = qIndex === 0;
      pageIndex = pIndex;
      prevQuestion = template.pages[pIndex].elements[`${ isFirstQuestion ? qIndex : qIndex - 1}`].name;
      return true;
    }
    return false;
  }));

  // Place the question inside the child form after the previous question if possible
  structure.pages.forEach((page, pIndex) => page.elements.findIndex((el, qIndex) => {
    if (el.name === prevQuestion && !isFirstQuestion) {
      structure.pages[pIndex].elements.splice(qIndex + 1, 0, getQuestion(template, name));
    } else if (isFirstQuestion && pageIndex === pIndex && qIndex === 0) {
      structure.pages[pIndex].elements.unshift(getQuestion(template, name));
    }
  }));
};
