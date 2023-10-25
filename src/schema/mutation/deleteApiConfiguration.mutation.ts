import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * Delete the passed apiConfiguration if authorized.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;
      const filters = ApiConfiguration.find(
        accessibleBy(ability, 'delete').ApiConfiguration
      )
        .where({ _id: args.id })
        .getFilter();
      const apiConfiguration = await ApiConfiguration.findOneAndDelete(filters);
      if (!apiConfiguration)
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      return apiConfiguration;
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
