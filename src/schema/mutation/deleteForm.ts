import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form, Resource } from '../../models';
import { buildTypes } from '../../utils/schema';
import { AppAbility } from '../../security/defineUserAbilities';

export default {
  /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: FormType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    // Get ability
    const ability: AppAbility = user.ability;

    // Get the form
    const form = await Form.accessibleBy(ability, 'delete').findOne({
      _id: args.id,
    });
    if (!form) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
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
