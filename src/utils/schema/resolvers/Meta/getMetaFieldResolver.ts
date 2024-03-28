import getMetaCheckboxResolver from './getMetaCheckboxResolver';
import getMetaDropdownResolver from './getMetaDropdownResolver';
import getMetaOwnerResolver from './getMetaOwnerResolver';
import getMetaUsersResolver from './getMetaUsersResolver';
import getMetaRadioResolver from './getMetaRadiogroupResolver';
import getMetaTagboxResolver from './getMetaTagboxResolver';
import getMetaPeopleResolver from './getMetaPeopleResolver';
import { Context } from '@server/apollo/context';

/**
 * Return GraphQL resolver of the field, based on its type.
 *
 * @param field field definition.
 * @param context graphQL context.
 * @returns resolver of the field.
 */
const getMetaFieldResolver = (field: any, context: Context) => {
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
    case 'users': {
      return getMetaUsersResolver(field);
    }
    case 'people': {
      return getMetaPeopleResolver(field, context);
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
