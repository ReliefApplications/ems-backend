import { mapKoboExpression } from './kobo/mapKoboExpression';
import { commonProperties } from './kobo/commonProperties';

/**
 * Saves all groupElement questions equivalent to the panel question.
 * Groups and panels can be nested.
 */
const groupElements = [];
/**
 * Saves the repeatGroupElement question equivalent to the dynamic panel question.
 * Groups and panels can be nested.
 */
const repeatGroupElements = [];

/**
 * SurveyJS survey structure
 */
const survey = {
  title: '',
  pages: [
    {
      name: 'page1',
      elements: [],
    },
  ],
  showQuestionNumbers: 'off',
};

/**
 * available fields types in kobo that are compatible with oort
 */
const AVAILABLE_TYPES = [
  'decimal',
  'geopoint',
  'select_multiple',
  'select_one',
  'date',
  'note',
  'begin_score',
  'score__row',
  'text',
  'time',
  'file',
  'integer',
  'datetime',
  'acknowledge',
  'begin_rank',
  'rank__level',
  'range',
  'image',
  'audio',
  'video',
  'geoshape',
  'calculate',
  'begin_group',
  'end_group',
  'begin_repeat',
  'end_repeat',
];

/**
 * Get all the groups names that are related to a kobo element.
 *
 * @param groupPath string with the group path of the kobo element (e.g. 'group_au9sz58/group_hl8uz79/ig1')
 * @returns array with all the groups in the groupPath of the element.
 */
const getElementsGroups = (groupPath: string) => {
  // Split all the paths in the group path
  const allPaths = groupPath.split('/');
  // Remove the last element (is the name of the current question)
  allPaths.pop();
  return allPaths;

  // NO LONGER USED BECAUSE IN THE INTEGRATION TESTS ALL THE GROUPS ARE RE-NAMED AND THE ID IS NOT THE SAME
  // const groupDelimiter = 'group_';
  // Filter parts that start with the groupDelimiter (that are group names)
  // return allPaths.filter((part: string) => part.startsWith(groupDelimiter));
};

/**
 * Adds a new question/element to the page elements, panel elements or to the dynamic panel template elements
 *
 * @param newElement element to add
 * @param elementPath string with the element path of the kobo element (e.g. 'group_au9sz58/group_hl8uz79/ig1')
 * @param parentGroup if element is a group and have a parent group, we already know it's parent group
 */
const addToElements = (
  newElement: any,
  elementPath: string | null,
  parentGroup?: string
) => {
  const groups = elementPath ? getElementsGroups(elementPath) : [];
  // If element is not part of a group
  if (!groups.length && !parentGroup) {
    survey.pages[0].elements.push(newElement);
  } else {
    // If element is part of a group, find out which one to add it to
    const groupElement = groupElements.find(
      (element: any) =>
        element.name === (parentGroup ?? groups[groups.length - 1])
    );
    if (groupElement) {
      groupElement.elements.push(newElement);
    } else {
      const repeatGroupElement = repeatGroupElements.find(
        (element: any) =>
          element.name === (parentGroup ?? groups[groups.length - 1])
      );
      if (repeatGroupElement) {
        repeatGroupElement.templateElements.push(newElement);
      }
    }
  }
};

/**
 * Extract kobo form fields and convert to oort fields
 *
 * @param koboSurvey Kobo survey structure
 * @param title Kobo survey title
 * @param choices Kobo choices data for the questions
 * @returns oort survey
 */
export const extractKoboFields = (
  koboSurvey: any,
  title: string,
  choices: any
) => {
  survey.title = title;
  survey.pages[0].elements = [];
  let scoreChoiceId = '';
  let rankChoiceId = '';

  koboSurvey.map((question: any, index: number) => {
    if (AVAILABLE_TYPES.includes(question.type)) {
      switch (question.type) {
        case 'decimal': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'number',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'geoshape':
        case 'geopoint': {
          const newQuestion = {
            ...commonProperties(index, question, 'geospatial'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'select_one':
        case 'select_multiple': {
          const newQuestion = {
            ...commonProperties(
              index,
              question,
              question.type === 'select_multiple' ? 'checkbox' : 'radiogroup'
            ),
            ...(question.type === 'select_multiple' && {
              showSelectAllItem: true,
            }),
            choices: choices
              .filter(
                (choice) => question.select_from_list_name === choice.list_name
              )
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
                ...(question.choice_filter &&
                  // If in the Kobo form the choice has the 'other' property, we will not add the visibleIf because of the 'or other=0' in the expression
                  !Object.prototype.hasOwnProperty.call(choice, 'other') && {
                    visibleIf: mapKoboExpression(
                      question.choice_filter,
                      null,
                      choice.$autovalue
                    ),
                  }),
              })),
            ...(question.parameters &&
              question.parameters.split('randomize=')[1]?.includes('true') && {
                choicesOrder: 'random',
              }),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'date': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'date',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'note': {
          const newQuestion = {
            ...commonProperties(index, question, 'expression'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'begin_score': {
          scoreChoiceId = question['kobo--score-choices'];
          break;
        }
        case 'score__row': {
          const newQuestion = {
            ...commonProperties(index, question, 'radiogroup'),
            choices: choices
              .filter((choice) => scoreChoiceId === choice.list_name)
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
              })),
            // This question does not have Validation Criteria settings (validators property)
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'begin_rank': {
          rankChoiceId = question['kobo--rank-items'];
          break;
        }
        case 'rank__level': {
          const newQuestion = {
            ...commonProperties(index, question, 'dropdown'),
            choices: choices
              .filter((choice) => rankChoiceId === choice.list_name)
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
              })),
            // This question does not have Validation Criteria settings
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'text': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'time': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'time',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'audio':
        case 'video':
        case 'image':
        case 'file': {
          const newQuestion = {
            ...commonProperties(index, question, 'file'),
            storeDataAsText: false,
            maxSize: 7340032,
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'integer': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'number',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'datetime': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'datetime-local',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'acknowledge': {
          const newQuestion = {
            ...commonProperties(index, question, 'boolean'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'range': {
          const newQuestion = {
            ...commonProperties(index, question, 'text'),
            inputType: 'range',
            step: question.parameters.split('step=')[1],
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'calculate': {
          const newQuestion = {
            ...commonProperties(
              index,
              question,
              'expression',
              question.calculation
            ),
            visible: false, // They are not displayed in the Kobo form, so make it invisible by default for the SurveyJS
            expression: mapKoboExpression(question.calculation),
            // This question does not have hint (description)
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'begin_group': {
          // Get all the groups names that are related to this group
          const groups = getElementsGroups(question.$xpath);
          const newGroupElement = {
            ...commonProperties(index, question, 'panel'),
            state: 'expanded',
            elements: [],
            groupId: question.$kuid,
            // If groups still has names, the last one is the directly parent group (i.e. this group is within another group)
            parentGroup: groups.length ? groups[groups.length - 1] : null,
          };
          groupElements.push(newGroupElement);
          break;
        }
        case 'end_group': {
          const groupIndex = groupElements.findIndex(
            (element: any) =>
              element.groupId === question.$kuid.substring(1) ||
              question.name === element.valueName
          );
          const groupElement = groupElements.splice(groupIndex, 1)[0];
          addToElements(groupElement, null, groupElement.parentGroup);
          break;
        }
        case 'begin_repeat': {
          // Get all the groups names that are related to this group
          const groups = getElementsGroups(question.$xpath);
          const newRepeatGroupElement = {
            ...commonProperties(index, question, 'paneldynamic'),
            state: 'expanded',
            confirmDelete: true,
            panelCount: 1,
            templateElements: [],
            groupId: question.$kuid,
            // If groups still has group names, the last one is the directly parent group (i.e. this group is within another group)
            parentGroup: groups.length ? groups[groups.length - 1] : null,
          };
          repeatGroupElements.push(newRepeatGroupElement);
          break;
        }
        case 'end_repeat': {
          const groupIndex = repeatGroupElements.findIndex(
            (element: any) =>
              element.groupId === question.$kuid.substring(1) ||
              question.name === element.valueName
          );
          const repeatGroupElement = repeatGroupElements.splice(
            groupIndex,
            1
          )[0];
          addToElements(
            repeatGroupElement,
            null,
            repeatGroupElement.parentGroup
          );
          break;
        }
      }
    }
  });
  // Order elements (is necessary because of groups being added to the survey elements only after closed)
  survey.pages[0].elements = survey.pages[0].elements.sort((a, b) =>
    a.index > b.index ? 1 : -1
  );
  return survey;
};
