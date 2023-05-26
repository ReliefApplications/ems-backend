import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { PageType } from '../types';
import { Page } from '@models';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

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
    const user = context.user;
    userNotLogged(user);
    try {
      // get data
      const page = await Page.findById(args.id);

      // check ability
      const ability = await extendAbilityForPage(user, page);
      if (ability.cannot('read', page)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return page;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
