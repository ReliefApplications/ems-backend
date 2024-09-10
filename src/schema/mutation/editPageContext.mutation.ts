import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Dashboard, Page, Resource, Workflow } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { PageContextArgs, PageContextInputType } from '@schema/inputs';
import { Types } from 'mongoose';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the editPageContext mutation */
type EditPageContextArgs = {
  id: string | Types.ObjectId;
  context: PageContextArgs;
};

/**
 *  Finds a page from its id and update it's context, if user is authorized.
 *  Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    context: { type: PageContextInputType },
  },
  async resolve(parent, args: EditPageContextArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // only one of refData or resource can be set
      const validSource =
        (!!args?.context?.refData && !args?.context?.resource) ||
        (!args?.context?.refData && !!args?.context?.resource);

      if (!args || !validSource)
        throw new GraphQLError(
          context.i18next.t(
            'mutations.page.edit.context.errors.invalidArguments'
          )
        );

      // Retrieve page, throw error if does not exist
      const page = await Page.findById(args.id);
      if (!page) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check if user can update page, throw error if not
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('update', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      const resourceChanged =
        'resource' in page.context &&
        ((page.context.resource instanceof Types.ObjectId &&
          !page.context.resource.equals(args.context.resource)) ||
          (page.context.resource instanceof Resource &&
            !page.context.resource._id.equals(args.context.resource)));

      const refDataChanged =
        'refData' in page.context &&
        page.context.refData !== args.context.refData;

      // If datasource origin changes, remove all previous contentWithContext
      if (resourceChanged || refDataChanged) {
        const idsToDelete = page.contentWithContext.map((c) => c.content);
        await Dashboard.deleteMany({ _id: { $in: idsToDelete } });
        await Workflow.deleteMany({ _id: { $in: idsToDelete } });
        page.contentWithContext = [];
      }

      // Update page context and return
      page.context = args.context;
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
