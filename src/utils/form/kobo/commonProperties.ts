import { mapKoboExpression } from './mapKoboExpression';

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
        expression: mapKoboExpression(question.constraint, question.$xpath),
      },
    ],
    validateOnValueChange: true,
  };
};

/**
 * Extract from a Kobo question the common properties in a object for a SurveyJS question
 *
 * @param index index/order of the element inside the Kobo structure
 * @param question Kobo question object
 * @param type type of the questions
 * @param title optional title
 * @returns the common properties in a object for a SurveyJS question extracted from the Kobo question
 */
export const commonProperties = (
  index: number,
  question: any,
  type: string,
  title?: string
) => {
  return {
    index,
    type,
    name: question.$xpath,
    title: title ?? (question.label ? question.label[0] : question.$xpath),
    valueName: question.$xpath,
    isRequired: question.required,
    ...(question.hint && { description: question.hint[0] }),
    ...(question.default && {
      defaultValue: mapKoboExpression(question.default),
    }),
    ...(question.relevant && {
      visibleIf: mapKoboExpression(question.relevant),
    }),
    ...(question.constraint && validators(question)),
    kobo: {
      type: question.type,
    },
  };
};
