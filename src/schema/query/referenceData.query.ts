import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ReferenceDataType } from '../types';
import { ReferenceData } from '@models';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Return Reference Data from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      return await ReferenceData.findById(args.id);
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
