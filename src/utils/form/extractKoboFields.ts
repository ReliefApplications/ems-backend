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
 * Maps expressions from kobo questions to a expression format that will work on the SurveyJS.
 *
 * The numeric operators (Greater than >, Less than <, Greater than or equal to >=, Less than or equal to <=) are used the in same way in Kobo and SurveyJS.
 *
 * @param koboExpression the initial kobo logic expression
 * @param questionName name of the question to replace in the expression
 * @returns the mapped logic expression that will work on the SurveyJS form
 */
const mapKoboExpression = (koboExpression: string, questionName?: string) => {
  // Replace . with {questionName}
  if (questionName) {
    // Expressions in Kobo can have ' . ' to indicate that the expression is about the question in which it is defined.
    // Example: a Validation Criteria can be ". > 5 ": the value of the question itself must be greater than 5
    koboExpression = koboExpression.replace(/\./g, `{${questionName}}`);
  }
  // Not contains
  koboExpression = koboExpression.replace(
    /not\(selected\(\$\{(\w+)\}, '(.*?)'\)\)/g,
    "{$1} notcontains '$2'"
  );
  // Replace not(...) with !(...)
  koboExpression = koboExpression.replace(/not\(/g, '!(');
  // Replace mod with %
  koboExpression = koboExpression.replace(
    /([^\/]*)\s+mod\s+([^\/]*)/g,
    (match, before, after) => {
      const transformedBefore = before.replace(/\$\{(\w+)\}/g, '{$1}');
      const transformedAfter = after.replace(/\$\{(\w+)\}/g, '{$1}');
      return `${transformedBefore} % ${transformedAfter}`;
    }
  );
  // Replace div with /
  koboExpression = koboExpression.replace(
    /([^\/]*)\s+div\s+([^\/]*)/g,
    (match, before, after) => {
      const transformedBefore = before.replace(/\$\{(\w+)\}/g, '{$1}');
      const transformedAfter = after.replace(/\$\{(\w+)\}/g, '{$1}');
      return `${transformedBefore} / ${transformedAfter}`;
    }
  );
  // Empty
  koboExpression = koboExpression.replace(/\$\{(\w+)\} = ''/g, '{$1} empty');
  // Equal to
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} = '(.*?)'/g,
    "({$1} = '$2')"
  );
  // Contains
  koboExpression = koboExpression.replace(
    /selected\(\$\{(\w+)\}, '(.*?)'\)/g,
    "{$1} contains '$2'"
  );
  // No empty
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} != ''/g,
    '{$1} notempty'
  );
  // Not equal to
  koboExpression = koboExpression.replace(
    /\$\{(\w+)\} != '(.*?)'/g,
    "{$1} <> '$2'"
  );
  // Replace ends-with with endsWith
  koboExpression = koboExpression.replace(/ends-with\(/g, 'endsWith(');
  // Replace count-selected with length
  koboExpression = koboExpression.replace(/count-selected\(/g, 'length(');
  // Replace of format-date-time with formatDateTime
  koboExpression = koboExpression.replace(
    /format-date-time\(/g,
    'formatDateTime('
  );
  // Replace if with iif
  koboExpression = koboExpression.replace(/if\(/g, 'iif(');
  // TODO: FIX not working with expressions like if(${number1} + ${number2} > 10,45,30) + today()
  // For calculations with today() + or - days, add addDays() custom function to work on oort
  koboExpression = koboExpression.replace(
    /today\(\)\s*([\+\-])\s*(\w+)/g,
    (match, operator, term) => {
      const transformedTerm = term.replace(/\$\{(\w+)\}/g, '{$1}');
      if (operator === '+') {
        return `addDays(today(), ${transformedTerm})`;
      } else {
        return `addDays(today(), -${transformedTerm})`;
      }
    }
  );
  // Replace now() with currentDate()
  koboExpression = koboExpression.replace(/now\(\)/g, 'currentDate()');
  // Date values
  koboExpression = koboExpression.replace(/date\('(.*?)'\)/g, "'$1'");
  // Replace any remaining ${variable} to {variable}
  koboExpression = koboExpression.replace(/\$\{(\w+)\}/g, '{$1}');
  return koboExpression;
};

/**
 * Extract from a Kobo question the constraint properties and return the validators property for an SurveyJS question
 *
 * @param question Kobo question object
 * @returns validators property for an SurveyJS question
 */
const validators = (question: any) => {
  return {
    validators: [
      {
        type: 'expression',
        text: question.constraint_message
          ? typeof question.constraint_message === 'string'
            ? question.constraint_message
            : question.constraint_message[0]
          : '',
        expression: mapKoboExpression(question.constraint, question.$autoname),
      },
    ],
    validateOnValueChange: true,
  };
};

/**
 * Extract from a Kobo question the common properties in a object for a SurveyJS question
 *
 * @param question Kobo question object
 * @param type type of the questions
 * @param title optional title
 * @returns the common properties in a object for a SurveyJS question extracted from the Kobo question
 */
const commonProperties = (question: any, type: string, title?: string) => {
  return {
    type,
    name: question.$autoname,
    title: title ?? question.label[0],
    valueName: question.$autoname,
    isRequired: question.required,
    ...(question.hint && { description: question.hint[0] }),
    ...(question.default && { defaultValue: question.default }), // TODO: add mapKoboExpression because the value can be a expression or function
    ...(question.relevant && {
      visibleIf: mapKoboExpression(question.relevant),
    }),
    ...(question.constraint && validators(question)),
  };
};

/**
 * Get all the groups names that are related to a kobo element.
 *
 * @param groupPath string with the group path of the kobo element (e.g. 'group_au9sz58/group_hl8uz79/ig1')
 * @returns array with all the groups in the groupPath of the element.
 */
const getElementsGroups = (groupPath: string) => {
  const groupDelimiter = 'group_';
  // Split all the paths in the group path
  const allPaths = groupPath.split('/');
  // Filter parts that start with the groupDelimiter (that are group names)
  return allPaths.filter((part: string) => part.startsWith(groupDelimiter));
};

/**
 * Adds a new question/element to the page elements, panel elements or to the dynamic panel template elements
 *
 * @param newElement element to add
 * @param elementPath string with the element path of the kobo element (e.g. 'group_au9sz58/group_hl8uz79/ig1')
 */
const addToElements = (newElement: any, elementPath: string | null) => {
  const groups = elementPath ? getElementsGroups(elementPath) : [];
  // If element is not part of a group
  if (!groups.length) {
    survey.pages[0].elements.push(newElement);
  } else {
    // If element is part of a group, find out which one to add it to
    const groupElement = groupElements.find(
      (element: any) => element.name === groups[groups.length - 1]
    );
    if (groupElement) {
      groupElement.elements.push(newElement);
    } else {
      const repeatGroupElement = repeatGroupElements.find(
        (element: any) => element.name === groups[groups.length - 1]
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

  koboSurvey.map((question: any) => {
    if (AVAILABLE_TYPES.includes(question.type)) {
      switch (question.type) {
        case 'decimal': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'number',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'geoshape':
        case 'geopoint': {
          const newQuestion = {
            ...commonProperties(question, 'geospatial'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'select_one':
        case 'select_multiple': {
          const newQuestion = {
            ...commonProperties(
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
            ...commonProperties(question, 'text'),
            inputType: 'date',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'note': {
          const newQuestion = {
            ...commonProperties(question, 'expression'),
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
            ...commonProperties(question, 'radiogroup'),
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
            ...commonProperties(question, 'dropdown'),
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
            ...commonProperties(question, 'text'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'time': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
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
            ...commonProperties(question, 'file'),
            storeDataAsText: false,
            maxSize: 7340032,
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'integer': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'number',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'datetime': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'datetime-local',
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'acknowledge': {
          const newQuestion = {
            ...commonProperties(question, 'boolean'),
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'range': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'range',
            step: question.parameters.split('step=')[1],
          };
          addToElements(newQuestion, question.$xpath);
          break;
        }
        case 'calculate': {
          const newQuestion = {
            ...commonProperties(question, 'expression', question.calculation),
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
          // Remove the last group because it is this group
          groups.pop();
          const newGroupElement = {
            ...commonProperties(question, 'panel'),
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
            (element: any) => element.groupId === question.$kuid.substring(1)
          );
          const groupElement = groupElements.splice(groupIndex, 1)[0];
          addToElements(groupElement, groupElement.parentGroup);
          break;
        }
        case 'begin_repeat': {
          // Get all the groups names that are related to this group
          const groups = getElementsGroups(question.$xpath);
          // Remove the last group because it is this group
          groups.pop();
          const newRepeatGroupElement = {
            ...commonProperties(question, 'paneldynamic'),
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
            (element: any) => element.groupId === question.$kuid.substring(1)
          );
          const repeatGroupElement = repeatGroupElements.splice(
            groupIndex,
            1
          )[0];
          addToElements(repeatGroupElement, repeatGroupElement.parentGroup);
          break;
        }
      }
    }
  });
  return survey;
};
