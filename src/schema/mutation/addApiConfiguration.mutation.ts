import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { authType, status } from '@const/enumTypes';
import { validateApi } from '@utils/validators/validateApi';

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
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
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
        return apiConfiguration.save();
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
  },
};
