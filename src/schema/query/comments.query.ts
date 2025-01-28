import {
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { Comment } from '@models';
import { CommentType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the Comment query */
type CommentArgs = {
  record: string | Types.ObjectId;
  questionId: string;
};

/**
 * Find comments linked to record and question
 */
export default {
  type: new GraphQLList(CommentType),
  args: {
    record: { type: new GraphQLNonNull(GraphQLID) },
    questionId: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: CommentArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const comments = await Comment.find({
        record: args.record,
        questionId: args.questionId,
      });
      return comments;
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
