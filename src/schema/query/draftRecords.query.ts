import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList } from 'graphql';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { DraftRecordType } from '../types';
import { DraftRecord } from '@models';
import { Types } from 'mongoose';

type DraftRecordsArgs = {
  form: string | Types.ObjectId;
};

/**
 * List all draft records available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(DraftRecordType),
  args: {
    form: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DraftRecordsArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      //Only get draft records created by current user
      const draftRecords = await DraftRecord.find({
        'createdBy.user': user._id.toString(),
        form: args.form,
      });
      return draftRecords;
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
