import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page } from '../../models';
import extendAbilityOnPage from '../../security/extendAbilityOnPage';

/**
 * Delete a page from its id and erase its reference in the corresponding application.
 * Also delete recursively the linked Workflow or Dashboard.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user)
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));

    // get data
    const page = await Page.findById(args.id);

    // get permissions
    const ability = await extendAbilityOnPage(user, page);
    if (ability.cannot('delete', page)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // delete page
    await page.deleteOne();
    return page;
  },
};
