import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Dashboard, Page, Workflow } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';

/**
 *  Finds a page from its id and remove it's context and contentWithContext,
 * if user is authorized. Throws an error if not logged or authorized.
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

      // Get data
      const page = await Page.findById(args.id);
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permission
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('update', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Remove all previous contentWithContext
      if (page.contentWithContext && page.contentWithContext.length) {
        const idsToDelete = page.contentWithContext.map((c) => c.content);
        await Dashboard.deleteMany({ _id: { $in: idsToDelete } });
        await Workflow.deleteMany({ _id: { $in: idsToDelete } });
        page.contentWithContext = [];
      }

      page.context = undefined;
      await page.save();
      return page;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
