import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import { Form } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import { canAccessContent } from '../../security/accessFromApplicationPermissions';

export default {
  /*  Returns form from id if available for the logged user.
        Throw GraphQL error if not logged.
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

    const ability: AppAbility = user.ability;

    // get form
    const form = await Form.findById(args.id);

    // grant access if user can read form
    if (form && ability.can('read', form)) {
      return form;
    }

    // grant access if user is admin and can see parent application
    // TODO: check what it is supposed to, maybe to delete
    if (user.isAdmin && (await canAccessContent(args.id, 'read', ability))) {
      return form;
    }

    // if user is in none of these cases, deny access
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
