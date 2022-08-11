import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form, Page, Step } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';
import extendAbilityForContent from '../../security/extendAbilityForContent';

/**
 * Return form from id if available for the logged user.
 * Throw GraphQL error if not logged.
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
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // get data and permissions
    const form = await Form.findById(args.id);
    if (!form) {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }
    const ability = await extendAbilityForContent(user, form);
    if (ability.cannot('read', form)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    return form;
  },
};
