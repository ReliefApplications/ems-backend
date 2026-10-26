import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import { Record } from '@models';
import { deleteRecords, findRecordsByIds, updateRecords } from '@utils/storage';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the deleteRecords mutation */
type DeleteRecordsArgs = {
  ids: string[] | Types.ObjectId[];
  hardDelete?: boolean;
};

/**
 * Delete multiple records.
 * Throw an error if not logged or authorized.
 */
export default {
  type: GraphQLInt,
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args: DeleteRecordsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get records and forms objects
      const toDelete: Record[] = [];
      const records: Record[] = await findRecordsByIds(
        args.ids,
        {},
        { populate: { path: 'form', model: 'Form' } }
      );

      // Create list of records to delete
      for (const record of records) {
        // Check ability
        const ability = await extendAbilityForRecords(user, record.form);
        if (ability.can('delete', record)) {
          toDelete.push(record);
        }
      }

      // Delete the records
      if (args.hardDelete) {
        return await deleteRecords(toDelete);
      } else {
        return await updateRecords(toDelete, { $set: { archived: true } });
      }
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
