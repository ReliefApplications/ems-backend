import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the deleteApiConfiguration mutation */
type DeleteApiConfigurationArgs = {
  id: string | Types.ObjectId;
};

/**
 * Delete the passed apiConfiguration if authorized.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteApiConfigurationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
