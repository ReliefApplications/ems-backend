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
    case 'text':
      switch (question.inputType) {
        case 'text':
          return 'text';
        case 'number':
          return 'numeric';
        case 'color':
          return 'color';
        case 'date':
          return 'date';
        case 'datetime-local':
          return 'datetime-local';
        case 'datetime':
          return 'datetime';
        case 'time':
          return 'time';
        case 'url':
          return 'url';
        case 'tel':
          return 'tel';
        case 'email':
          return 'email';
        default:
          return 'text';
      }
    case 'file':
      return 'file';
    case 'expression':
      switch (question.displayStyle) {
        case 'date':
          return 'date';
        case 'decimal':
          return 'decimal';
        case 'currency':
          return 'decimal';
        case 'percent':
          return 'decimal';
        case 'number':
          return 'numeric';
        default:
          return 'text';
      }
    case 'checkbox':
      return 'checkbox';
    case 'radiogroup':
      return 'radiogroup';
    case 'dropdown':
      return 'dropdown';
    case 'multipletext':
      return 'multipletext';
    case 'matrix':
      return 'matrix';
    case 'matrixdropdown':
      return 'matrixdropdown';
    case 'matrixdynamic':
      return 'matrixdynamic';
    case 'boolean':
      return 'boolean';
    case 'resource':
      return 'resource';
    case 'resources':
      return 'resources';
    case 'tagbox':
      return 'tagbox';
    case 'users':
      return 'users';
    case 'owner':
      return 'owner';
    default:
      return 'text';
  }
};
