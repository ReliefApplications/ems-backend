import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Dashboard, Page, Resource, Workflow } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { PageContextInputType } from '@schema/inputs';
import { Types } from 'mongoose';

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
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    // only one of refData or resource can be set
    const validSource =
      (!!args?.context?.refData && !args?.context?.resource) ||
      (!args?.context?.refData && !!args?.context?.resource);

    if (!args || !validSource)
      throw new GraphQLError(
        context.i18next.t('mutations.page.edit.context.errors.invalidArguments')
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
  },
};
