import { getQuestion } from './getQuestion';

/**
 * Check if the structure is correct and add a new field at the beginning. Use a passed structure to fetch the correct question.
 * Function by induction.
 * @param structure structure of the form to edit
 * @param name name of the fied to search for
 * @param template structure of the core template
 */
export const addField = (structure: any, name: string, template: any): void => {
  for (const page in template.pages) {
    for (const questionIndex in template.pages[page].elements) {
      if (template.pages[page].elements[questionIndex].name === name) {
        structure.pages[page].elements.splice(questionIndex, 0, getQuestion(template, name));
      }
    }
  }
  
};
