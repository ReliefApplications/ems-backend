import { GraphQLError } from 'graphql';
import { Record } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { getDraftRecordFilter } from '@utils/filter';

/**
 * Returns a resolver that fetches a record if the users logged
 * or throws an error if not
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  async (_, { id, data, draft, allDrafts }, context) => {
    graphQLAuthCheck(context);
    try {
      const record = await Record.findOne({
        _id: id,
        archived: { $ne: true },
        ...getDraftRecordFilter({ draft, allDrafts }, context.user),
      });
      if (data) {
        record.data = data;
      }
      return record;
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  };
