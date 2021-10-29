import getMetaCheckboxResolver from './getMetaCheckboxResolver';
import getMetaDropdownResolver from './getMetaDropdownResolver';
import getMetaOwnerResolver from './getMetaOwnerResolver';
import getMetaRadioResolver from './getMetaRadiogroupResolver';
import getMetaTagboxResolver from './getMetaTagboxResolver';

/**
 * Return GraphQL resolver of the field, based on its type.
 * @param field field definition.
 * @returns resolver of the field.
 */
const getMetaFieldResolver = (field: any) => {
  switch (field.type) {
    case 'dropdown': {
      return getMetaDropdownResolver(field);
    }
    case 'radiogroup': {
      return getMetaRadioResolver(field);
    }
    case 'checkbox': {
      return getMetaCheckboxResolver(field);
    }
    case 'tagbox': {
      return getMetaTagboxResolver(field);
    }
    case 'owner': {
      return getMetaOwnerResolver(field);
    }
    default: {
      return field;
    }
  }
};

export default getMetaFieldResolver;
