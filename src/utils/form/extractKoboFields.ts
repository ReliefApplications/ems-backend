/**
 * available fields types in kobo that are compatible with oort
 */
const AVAILABLE_TYPES = [
  'decimal',
  'geopoint',
  'select_multiple',
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
];

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
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            inputType: 'number',
            ...(question.hint && { description: question.hint[0] }),
            ...(question.default && { defaultValue: question.default }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'geopoint': {
          const newQuestion = {
            type: 'geospatial',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'select_multiple': {
          const newQuestion = {
            type: 'checkbox',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            choices: choices
              .filter(
                (choice) => question.select_from_list_name === choice.list_name
              )
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
              })),
            showSelectAllItem: true,
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'date': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'date',
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'note': {
          const newQuestion = {
            type: 'expression',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            ...(question.hint && { description: question.hint[0] }),
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
            type: 'radiogroup',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            choices: choices
              .filter((choice) => scoreChoiceId === choice.list_name)
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
              })),
            ...(question.hint && { description: question.hint[0] }),
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
            type: 'dropdown',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            isRequired: question.required,
            choices: choices
              .filter((choice) => rankChoiceId === choice.list_name)
              .map((choice) => ({
                value: choice.$autovalue,
                text: choice.label[0],
              })),
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'text': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            ...(question.hint && { description: question.hint[0] }),
            ...(question.default && { defaultValue: question.default }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'time': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'time',
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'image':
        case 'file': {
          const newQuestion = {
            type: 'file',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            storeDataAsText: false,
            maxSize: 7340032,
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'integer': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'number',
            ...(question.hint && { description: question.hint[0] }),
            ...(question.default && { defaultValue: question.default }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'datetime': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            isRequired: question.required,
            valueName: question.$autoname.toLowerCase(),
            inputType: 'datetime-local',
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'acknowledge': {
          const newQuestion = {
            type: 'boolean',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            ...(question.hint && { description: question.hint[0] }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
        case 'range': {
          const newQuestion = {
            type: 'text',
            name: question.$autoname.toLowerCase(),
            title: question.label[0],
            valueName: question.$autoname.toLowerCase(),
            inputType: 'range',
            step: question.parameters.split('step=')[1],
            ...(question.hint && { description: question.hint[0] }),
            ...(question.default && { defaultValue: question.default }),
          };
          questions.pages[0].elements.push(newQuestion);
          break;
        }
      }
    }
  });
  return questions;
};
