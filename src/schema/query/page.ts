import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page, Application } from '../../models';
import { AppAbility } from '../../security/defineUserAbility';

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
    const ability: AppAbility = context.user.ability;
    const page = await Page.findOne(
      Page.accessibleBy(ability).where({ _id: args.id }).getFilter()
    );
    if (!page) {
      // If user is admin and can see parent application, it has access to it
      if (user.isAdmin) {
        const application = await Application.findOne(
          { pages: args.id },
          'id permissions'
        ).accessibleBy(ability, 'read');
        if (application) {
          return Page.findById(args.id);
        }
      }
    } else {
      return page;
    }
    throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
  },
};
