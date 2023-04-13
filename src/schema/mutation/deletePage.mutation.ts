import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';

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
    try {
      // Authentication check
      const user = context.user;
      if (!user)
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );

      // get data
      const page = await Page.findById(args.id);

      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // get permissions
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('delete', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // delete page
      await page.deleteOne();
      return page;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
