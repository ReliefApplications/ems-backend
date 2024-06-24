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
  // Replace if with iif
  koboExpression = koboExpression.replace(/if\(/g, 'iif(');
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
        expression: mapKoboExpression(
          question.constraint,
          question.$autoname.toLowerCase()
        ),
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
    name: question.$autoname.toLowerCase(),
    title: title ?? question.label[0],
    valueName: question.$autoname.toLowerCase(),
    isRequired: question.required,
    ...(question.hint && { description: question.hint[0] }),
    // TODO: make sure that the defaultValue works for all type of questions. Works for sure for the questions type: integer, text, decimal, range.
    ...(question.default && { defaultValue: question.default }),
    ...(question.relevant && {
      visibleIf: mapKoboExpression(question.relevant),
    }),
    ...(question.constraint && validators(question)),
  };
};

/**
 * Extract kobo form fields and convert to oort fields
 *
 * @param survey survey structure
 * @param title title
 * @param choices choices
 * @returns oort survey
 */
export const extractKoboFields = (survey: any, title: string, choices: any) => {
  const questions = {
    title: title,
    pages: [
      {
        name: 'page1',
        elements: [],
      },
    ],
    showQuestionNumbers: 'off',
  };

  let scoreChoiceId = '';
  let rankChoiceId = '';

  survey.map((question: any) => {
    if (AVAILABLE_TYPES.includes(question.type)) {
      switch (question.type) {
        case 'decimal': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'number',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'geoshape':
        case 'geopoint': {
          const newQuestion = {
            ...commonProperties(question, 'geospatial'),
          };
          questions.pages[0].elements.push(newQuestion);
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
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'date': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'date',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'note': {
          const newQuestion = {
            ...commonProperties(question, 'expression'),
          };
          questions.pages[0].elements.push(newQuestion);
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
          questions.pages[0].elements.push(newQuestion);
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
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'text': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'time': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'time',
          };
          questions.pages[0].elements.push(newQuestion);
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
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'integer': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'number',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'datetime': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'datetime-local',
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'acknowledge': {
          const newQuestion = {
            ...commonProperties(question, 'boolean'),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'range': {
          const newQuestion = {
            ...commonProperties(question, 'text'),
            inputType: 'range',
            step: question.parameters.split('step=')[1],
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'calculate': {
          const newQuestion = {
            ...commonProperties(question, 'expression', question.calculation),
            visible: false, // They are not displayed in the Kobo form, so make it invisible by default for the SurveyJS
            expression: mapKoboExpression(question.calculation),
            // This question does not have hint (description)
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
      }
    }
  });
  return questions;
};
