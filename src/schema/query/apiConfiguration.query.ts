import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApiConfigurationType } from '../types';
import { ApiConfiguration } from '@models';

/**
 * Return api configuration from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability = context.user.ability;
    if (ability.can('read', 'ApiConfiguration')) {
      return ApiConfiguration.findById(args.id);
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
