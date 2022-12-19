import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form } from '@models';
// import extendAbilityForContent from '@security/extendAbilityForContent';
import extendAbilityForRecords from '@security/extendAbilityForRecords';

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
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // get data and permissions
    const form = await Form.findById(args.id).populate({
      path: 'resource',
      model: 'Resource',
    });
    if (!form) {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }

    const ability = await extendAbilityForRecords(user, form);
    if (ability.cannot('read', form)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    return form;
  },
};
