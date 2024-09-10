import { GraphQLError } from 'graphql';
import { Record } from '@models';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Returns a resolver that fetches a record if the users logged
 * or throws an error if not
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  async (_, { id, data }, context) => {
    graphQLAuthCheck(context);
    try {
      const record = await Record.findOne({ _id: id, archived: { $ne: true } });
      if (data) {
        record.data = data;
      }
      return record;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  };
