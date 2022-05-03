import { GraphQLError, GraphQLList } from 'graphql';
import { PageType } from '../types';
import { Page } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /*  List all pages available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: new GraphQLList(PageType),
  resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = context.user.ability;
    return Page.accessibleBy(ability, 'read');
  },
};
