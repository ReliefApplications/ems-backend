import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { DraftRecordType } from '../types';
import { DraftRecord } from '@models';
import { Types } from 'mongoose';

/** Arguments for the deleteRecord mutation */
type DeleteDraftRecordArgs = {
  id: string | Types.ObjectId;
};

/**
 * Hard-deletes a draft record. Every user can delete their own drafts
 * Throw an error if not logged.
 */
export default {
  type: DraftRecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteDraftRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // Get draft Record and associated form
      const draftRecord = await DraftRecord.findById(args.id);
      return await DraftRecord.findByIdAndDelete(draftRecord._id);
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
