import { displayStyle, inputType, questionType } from '@services/form.service';

/**
 * Gets the type of the field from the definition of the question.
 *
 * @param question question to find type of
 * @param question.type main type of question
 * @param question.inputType input type of question
 * @param question.displayStyle display type ( if expression )
 * @returns type of the question
 */
export const getFieldType = async (question: {
  type?: string;
  inputType?: string;
  displayStyle?: string;
}): Promise<string> => {
  switch (question.type) {
    case questionType.TEXT:
      switch (question.inputType) {
        case inputType.TEXT:
          return inputType.TEXT;
        case inputType.NUMBER:
          return inputType.NUMERIC;
        case inputType.COLOR:
          return inputType.COLOR;
        case inputType.DATE:
          return inputType.DATE;
        case inputType.DATETIME_LOCAL:
          return inputType.DATETIME_LOCAL;
        case inputType.DATETIME:
          return inputType.DATETIME;
        case inputType.TIME:
          return inputType.TIME;
        case inputType.URL:
          return inputType.URL;
        case inputType.TEL:
          return inputType.TEL;
        case inputType.EMAIL:
          return inputType.EMAIL;
        default:
          return inputType.TEXT;
      }
    case questionType.FILE:
      return questionType.FILE;
    case questionType.EXPRESSION:
      switch (question.displayStyle) {
        case displayStyle.DATE:
          return inputType.DATE;
        case displayStyle.DECIMAL:
          return inputType.DECIMAL;
        case displayStyle.CURRENCY:
          return inputType.DECIMAL;
        case displayStyle.PERCENT:
          return inputType.DECIMAL;
        case displayStyle.NUMBER:
          return inputType.NUMERIC;
        default:
          return questionType.TEXT;
      }
    case questionType.CHECKBOX:
      return questionType.CHECKBOX;
    case questionType.RADIO_GROUP:
      return questionType.RADIO_GROUP;
    case questionType.DROPDOWN:
      return questionType.DROPDOWN;
    case questionType.MULTIPLE_TEXT:
      return questionType.MULTIPLE_TEXT;
    case questionType.MATRIX:
      return questionType.MATRIX;
    case questionType.MATRIX_DROPDOWN:
      return questionType.MATRIX_DROPDOWN;
    case questionType.MATRIX_DYNAMIC:
      return questionType.MATRIX_DYNAMIC;
    case questionType.BOOLEAN:
      return questionType.BOOLEAN;
    case questionType.RESOURCE:
      return questionType.RESOURCE;
    case questionType.RESOURCES:
      return questionType.RESOURCES;
    case questionType.TAGBOX:
      return questionType.TAGBOX;
    case questionType.USERS:
      return questionType.USERS;
    case questionType.OWNER:
      return questionType.OWNER;
    case questionType.GEOSPATIAL:
      return questionType.GEOSPATIAL;
    case questionType.EDITOR: {
      return questionType.EDITOR;
    }
    default:
      return questionType.TEXT;
  }
};
