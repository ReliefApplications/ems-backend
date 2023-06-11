import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { PageType } from '../types';
import { Page } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';

/**
 *  Finds a page from its id and update it, if user is authorized.
 *    Update the field visible of a page
 *    Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    visible: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      // check inputs
      if (!args)
        throw new GraphQLError(
          context.i18next.t('mutations.page.edit.visibility.errors')
        );
      // get data
      const page = await Page.findById(args.id);
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // check permission
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('update', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      page.visible = args.visible;
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
