import { GraphQLError } from 'graphql';
import { Record } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { getDraftRecordFilter } from '@utils/filter';
import { getAccessibleFields } from '@utils/form';
import { accessibleBy } from '@casl/mongoose';
import { Context } from '@server/apollo/context';
import { RecordVisibility } from '@const/enumTypes';
import getRecordsAbility from './getRecordsAbility';

/** Arguments of the single entity query */
type SingleArgs = {
  id: string;
  display?: boolean;
  data?: any;
  recordVisibility?: RecordVisibility;
};

/**
 * Returns a resolver that fetches a record by id, if the user is logged
 * and allowed to read it. Mirrors the `all` resolver: the user ability on
 * records is applied as a query filter, so a record the user cannot read is
 * simply not found, drafts follow the requested record visibility, and only
 * the fields the user can read are returned.
 *
 * @returns A resolver function that fetches a record by id
 */
export default () =>
  async (_, { id, data, recordVisibility }: SingleArgs, context: Context) => {
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
      // Keep only the fields the user can read
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
