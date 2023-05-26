import { GraphQLError, GraphQLList } from 'graphql';
import { PageType } from '../types';
import { Application, Page } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForPage from '@security/extendAbilityForPage';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

/**
 * List all pages available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PageType),
  async resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      // create ability object for all pages
      let ability: AppAbility = user.ability;
      const applications = await Application.accessibleBy(
        ability,
        'read'
      ).find();
      for (const application of applications) {
        ability = await extendAbilityForPage(user, application, ability);
      }

      // return the pages
      return await Page.accessibleBy(ability, 'read').find();
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
