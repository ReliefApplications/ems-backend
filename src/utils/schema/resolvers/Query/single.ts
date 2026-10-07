import { GraphQLError } from 'graphql';
import { Record } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { getDraftRecordFilter } from '@utils/filter';
import { getAccessibleFields } from '@utils/form';
import { accessibleBy } from '@casl/mongoose';
import getRecordsAbility from './getRecordsAbility';

/**
 * Returns a resolver that fetches a record if the users logged
 * or throws an error if not
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  async (_, { id, data, recordVisibility }, context) => {
    graphQLAuthCheck(context);
    try {
      // Same permission check as the all resolver
      const ability = await getRecordsAbility(context.user, context);
      const permissionFilters = Record.find(
        accessibleBy(ability, 'read').Record
      ).getFilter();
      const record = await Record.findOne({
        $and: [
          {
            _id: id,
            archived: { $ne: true },
            ...getDraftRecordFilter({ recordVisibility }, context.user),
          },
          permissionFilters,
        ],
      });
      if (!record) {
        return null;
      }
      getAccessibleFields(record, ability);
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
