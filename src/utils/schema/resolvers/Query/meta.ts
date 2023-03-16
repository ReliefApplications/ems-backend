import { GraphQLError } from 'graphql';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { Form, Resource } from '@models';

/**
 * Gets a resolver that returns the fields of a form or resource
 * if they exist, or throw an error if they don't
 *
 * @param id The id of the form/resource
 * @returns The resolver function
 */
export default (id) => async (parent, args, context) => {
  const user = context.user;
  if (!user) {
    throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
  }

  const form = await Form.findById(id);
  if (!form) {
    const resource = await Resource.findById(id);
    if (!resource) {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    } else {
      const ability = await extendAbilityForRecords(user, resource);
      return resource.fields.reduce((fields, field) => {
        fields[field.name] = {
          ...field,
          permissions: {
            canSee: ability.can('read', resource, `data.${field.name}`),
            canUpdate: ability.can('update', resource, `data.${field.name}`),
          },
        };
        return fields;
      }, {});
    }
  } else {
    const ability = await extendAbilityForRecords(user, form);
    return form.fields.reduce((fields, field) => {
      fields[field.name] = {
        ...field,
        permissions: {
          canSee: ability.can('read', form, `data.${field.name}`),
          canUpdate: ability.can('update', form, `data.${field.name}`),
        },
      };
      return fields;
    }, {});
  }
};
