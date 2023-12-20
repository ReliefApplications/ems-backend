import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { ApiConfigurationType } from '../types';
import { ApiConfiguration } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the apiConfiguration query */
type ApiConfigurationArgs = {
  id: string | Types.ObjectId;
  skipCache?: boolean;
};

/**
 * Return api configuration from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    skipCache: { type: GraphQLBoolean },
  },
  async resolve(parent, args: ApiConfigurationArgs, context: Context) {
    //log the variables
    console.log('query variables', args);
    // if skipCache is true, call the proxyAPIRequest to fetch the data from the API
    //TODO

    graphQLAuthCheck(context);
    try {
      const ability = context.user.ability;
      if (ability.can('read', 'ApiConfiguration')) {
        return await ApiConfiguration.findById(args.id);
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
