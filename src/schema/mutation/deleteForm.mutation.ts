import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form, Resource } from '@models';
import { buildTypes } from '@utils/schema';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Find form from its id and delete it, and all records associated, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: FormType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // Get ability
    const ability: AppAbility = user.ability;

    // Get the form
    const filters = Form.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const form = await Form.findOne(filters);
    if (!form) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    // if is core form we have to delete the linked forms and resource
    if (form.core) {
      // delete the resource and all forms associated
      await Resource.deleteOne({ _id: form.resource });
    } else {
      await form.deleteOne();
    }
    buildTypes();
    return form;
  },
};
