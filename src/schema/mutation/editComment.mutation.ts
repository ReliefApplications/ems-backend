import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Comment } from '@models';
import { CommentType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addComment mutation */
type EditCommentArgs = {
  resolved: boolean;
  record: string | Types.ObjectId;
  questionId: string;
};

/**
 * Create a new comment.
 */
export default {
  type: CommentType,
  args: {
    resolved: { type: GraphQLBoolean },
    record: { type: new GraphQLNonNull(GraphQLID) },
    questionId: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: EditCommentArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const latestComment = await Comment.findOne({
        record: args.record,
        questionId: args.questionId,
      }).sort({ createdAt: -1 });

      return await Comment.findByIdAndUpdate(latestComment.id, {
        resolved: args.resolved,
      });
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
