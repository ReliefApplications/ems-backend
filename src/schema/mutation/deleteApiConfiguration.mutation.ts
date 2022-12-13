import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { status } from '@const/enumTypes';
import { buildTypes } from '@utils/schema';

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
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const filters = ApiConfiguration.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const apiConfiguration = await ApiConfiguration.findOneAndDelete(filters);
    if (!apiConfiguration)
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    if (apiConfiguration.status === status.active) {
      buildTypes();
    }
    return apiConfiguration;
  },
};
