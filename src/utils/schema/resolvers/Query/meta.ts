import { GraphQLError } from 'graphql';
import extendAbilityForRecords from '../../../../security/extendAbilityForRecords';
import { Form, Resource } from '../../../../models';

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
    throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
  }

  const form = await Form.findById(id);
  if (!form) {
    const resource = await Resource.findById(id);
    if (!resource) {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    } else {
      const ability = await extendAbilityForRecords(user, resource);
      return resource.fields.reduce((fields, field) => {
        fields[field.name] = {
          ...field,
          permissions: {
            canSee: ability.can('read', resource, `field.${field.name}`),
            canUpdate: ability.can('update', resource, `field.${field.name}`),
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
          canSee: ability.can('read', form, `field.${field.name}`),
          canUpdate: ability.can('update', form, `field.${field.name}`),
        },
      };
      return fields;
    }, {});
  }
};
