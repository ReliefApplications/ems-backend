import { GraphQLNonNull, GraphQLString, GraphQLError } from 'graphql';
import { graphQLAuthCheck } from '@schema/shared';
import TranslationService from '../../services/translation.service';
import { logger } from '@services/logger.service';
import { Context } from '@server/apollo/context';

type TranslateTextArgs = {
  text: string;
  from?: string;
  to: string;
};

/**
 *
 */
export default {
  type: GraphQLString,
  args: {
    text: { type: new GraphQLNonNull(GraphQLString) },
    from: { type: GraphQLString },
    to: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args: TranslateTextArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      return await TranslationService.translate(
        args.text,
        args.from || null,
        args.to
      );
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
