import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page } from '../../models';
import extendAbilityOnPage from '../../security/extendAbilityOnPage';

/**
 * Return page from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // get data
    const page = await Page.findById(args.id);

    // check ability
    const ability = await extendAbilityOnPage(user, page);
    if (ability.cannot('read', page)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    return page;
  },
};
