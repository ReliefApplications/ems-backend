import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { authType, status } from '@const/enumTypes';
import { validateApi } from '@utils/validators/validateApi';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Create a new apiConfiguration.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApiConfigurationType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = user.ability;
      if (ability.can('create', 'ApiConfiguration')) {
        if (args.name !== '') {
          validateApi(args.name);
          const apiConfiguration = new ApiConfiguration({
            name: args.name,
            status: status.pending,
            authType: authType.serviceToService,
            permissions: {
              canSee: [],
              canUpdate: [],
              canDelete: [],
            },
          });
          return await apiConfiguration.save();
        }
        throw new GraphQLError(
          context.i18next.t(
            'mutations.apiConfiguration.add.errors.invalidArguments'
          )
        );
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
