import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page, Application } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';

export default {
  /*  Delete a page from its id and erase its reference in the corresponding application.
        Also delete recursively the linked Workflow or Dashboard
        Throws an error if not logged or authorized, or arguments are invalid.
    */
  type: PageType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user)
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));

    const ability: AppAbility = context.user.ability;
    const filters = Page.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    let page = await Page.findOneAndDelete(filters);
    if (!page) {
      const application = await Application.findOne({ pages: args.id });
      if (!application)
        throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
      if (user.isAdmin && ability.can('update', application)) {
        page = await Page.findByIdAndDelete(args.id);
      } else {
        throw new GraphQLError(
          context.i18next.t('errors.permissionNotGranted')
        );
      }
    }
    return page;
  },
};
