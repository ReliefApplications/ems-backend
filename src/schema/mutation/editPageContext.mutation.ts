import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { PageContextInputType } from '@schema/inputs';

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

    // TODO: When updating context, remove all previous contentWithContext

    // Update page context and return
    return Page.findByIdAndUpdate(args.id, {
      context: args.context,
    });
  },
};
