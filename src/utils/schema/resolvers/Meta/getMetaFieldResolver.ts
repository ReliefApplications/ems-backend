import getMetaCheckboxResolver from './getMetaCheckboxResolver';
import getMetaDropdownResolver from './getMetaDropdownResolver';
import getMetaOwnerResolver from './getMetaOwnerResolver';
import getMetaUsersResolver from './getMetaUsersResolver';
import getMetaRadioResolver from './getMetaRadiogroupResolver';
import getMetaTagboxResolver from './getMetaTagboxResolver';
import { questionType } from '@services/form.service';

/**
 * Return GraphQL resolver of the field, based on its type.
 *
 * @param field field definition.
 * @returns resolver of the field.
 */
const getMetaFieldResolver = (field: any) => {
  switch (field.type) {
    case questionType.DROPDOWN: {
      return getMetaDropdownResolver(field);
    }
    case questionType.RADIO_GROUP: {
      return getMetaRadioResolver(field);
    }
    case questionType.CHECKBOX: {
      return getMetaCheckboxResolver(field);
    }
    case questionType.TAGBOX: {
      return getMetaTagboxResolver(field);
    }
    case questionType.USERS: {
      return getMetaUsersResolver(field);
    }
    case questionType.OWNER: {
      return getMetaOwnerResolver(field);
    }
    default: {
      return field;
    }
  }
};

export default getMetaFieldResolver;
