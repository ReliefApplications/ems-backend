import { GraphQLError } from 'graphql';
import errors from '../../../../const/errors';
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
    throw new GraphQLError(errors.userNotLogged);
  }
  const form = await Form.findById(id);
  if (!form) {
    const resource = await Resource.findById(id);
    if (!resource) {
      throw new GraphQLError(errors.dataNotFound);
    } else {
      return resource.fields.reduce((fields, field) => {
        fields[field.name] = field;
        return fields;
      }, {});
    }
  } else {
    return form.fields.reduce((fields, field) => {
      fields[field.name] = field;
      return fields;
    }, {});
  }
};
