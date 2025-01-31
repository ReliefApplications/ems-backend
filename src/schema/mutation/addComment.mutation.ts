import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { Comment } from '@models';
import { CommentType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addComment mutation */
type AddCommentArgs = {
  message: string;
  record: string | Types.ObjectId;
  questionId: string;
};

/**
 * Create a new comment.
 */
export default {
  type: CommentType,
  args: {
    message: { type: GraphQLString },
    record: { type: new GraphQLNonNull(GraphQLID) },
    questionId: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: AddCommentArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      const comment = new Comment({
        message: args.message,
        record: args.record,
        questionId: args.questionId,
        createdBy: {
          user: user._id,
          roles: user.roles.map((x) => x._id),
          positionAttributes: user.positionAttributes.map((x) => {
            return {
              value: x.value,
              category: x.category._id,
            };
          }),
        },
      });
      return await comment.save();
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
