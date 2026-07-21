import { GraphQLError, GraphQLBoolean, GraphQLID, GraphQLList } from 'graphql';
import { RecordType } from '../types';
import { Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { DraftRecordFilterArgs, getDraftRecordFilter } from '@utils/filter';

/** Arguments for the records query. */
type RecordsArgs = DraftRecordFilterArgs & {
  form?: string;
  resource?: string;
};

/**
 * List all records available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(RecordType),
  args: {
    form: { type: GraphQLID },
    resource: { type: GraphQLID },
    draft: { type: GraphQLBoolean },
    allDrafts: { type: GraphQLBoolean },
  },
  async resolve(parent, args: RecordsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability = await extendAbilityForRecords(user);
      const records = await Record.find({
        ...accessibleBy(ability, 'read').Record,
        archived: { $ne: true },
        ...(args.form && { form: args.form }),
        ...(args.resource && { resource: args.resource }),
        ...getDraftRecordFilter(args, user),
      });
      return getAccessibleFields(records, ability);
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
