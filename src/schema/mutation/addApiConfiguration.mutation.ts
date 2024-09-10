import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { authType, status } from '@const/enumTypes';
import { validateApi } from '@utils/validators/validateApi';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addApiConfiguration mutation */
type AddApiConfigurationArgs = {
  name: string;
};

/**
 * Create a new apiConfiguration.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApiConfigurationType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: AddApiConfigurationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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
