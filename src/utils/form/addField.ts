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
  let prevQuestionName = '';
  let prevQuestionPanelName = '';
  let panelQuestionName = '';
  let isPanel = false;
  let isFirstQuestion = false;
  let isFirstQuestionInsidePanel = false;
  let pageIndex = 0;

  // Loop in the core form
  template.pages.forEach((page, pIndex) => page.elements.findIndex((el, qIndex) => {

    // set variables to locate the question
    if (el.name === name) {
      isFirstQuestion = qIndex === 0;
      pageIndex = pIndex;
      prevQuestionName = template.pages[pIndex].elements[`${ isFirstQuestion ? qIndex : qIndex - 1}`].name;
      return true;
    }

    // set variables to locate the question in case it's inside a panel
    if (el.type === 'panel') {
      el.elements.findIndex((element, eIndex) => {
        if (element.name === name) {
          isFirstQuestion = qIndex === 0;
          isFirstQuestionInsidePanel = eIndex === 0;
          isPanel = true;
          pageIndex = pIndex;
          panelQuestionName = el.name;
          prevQuestionPanelName = template.pages[pIndex].elements[`${ isFirstQuestion ? qIndex : qIndex - 1}`].name;
          prevQuestionName = template.pages[pIndex].elements[qIndex].elements[`${ isFirstQuestionInsidePanel ? eIndex : eIndex - 1}`].name;
          return true;
        }
        return false;
      });
    }
    return false;
  }));

  // Loop on the child form
  structure.pages.forEach((page, pIndex) => page.elements.findIndex((el, qIndex) => {
    // Create the panel inside the child form if needed
    if (isPanel && el.name === prevQuestionPanelName) {
      // Create the panel if needed and place it after the previous question if possible
      if (structure.pages[pIndex].elements[`${ isFirstQuestion ? qIndex : qIndex + 1}`].type !== 'panel' 
       && structure.pages[pIndex].elements[`${ isFirstQuestion ? qIndex : qIndex + 1}`].name !== panelQuestionName) {
        if (isFirstQuestion) {
          structure.pages[pIndex].elements.unshift(getQuestion(template, panelQuestionName));
        } else {
          structure.pages[pIndex].elements.splice(qIndex + 1, 0, getQuestion(template, panelQuestionName));
        }
      }
    }
  
    // Place the question inside the panel inside the child form after the previous question if possible
    if (isPanel && el.name === panelQuestionName) {
      el.elements.findIndex((element, eIndex) => {
        if (element.name === prevQuestionName && !isFirstQuestionInsidePanel) {
          structure.pages[pIndex].elements[qIndex].elements.splice(eIndex + 1, 0, getQuestion(template, name));
        } else if (isFirstQuestionInsidePanel && eIndex === 0) {
          structure.pages[pIndex].elements[qIndex].elements.unshift(getQuestion(template, name));
        }
      });
    }

    // Place the question inside the child form after the previous question if possible
    if (el.name === prevQuestionName && !isFirstQuestion && !isPanel) {
      structure.pages[pIndex].elements.splice(qIndex + 1, 0, getQuestion(template, name));
    } else if (isFirstQuestion  && !isPanel && pageIndex === pIndex && qIndex === 0) {
      structure.pages[pIndex].elements.unshift(getQuestion(template, name));
    }
  }));
};
