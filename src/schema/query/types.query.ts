import { GraphQLError, GraphQLObjectType } from 'graphql';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import GraphQLJSON from 'graphql-type-json';
import { introspectionResult } from '@server/index';

/**
 * Return the types to be used in the query builder.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLObjectType({
    name: 'Types',
    fields: () => ({
      availableQueries: {
        type: GraphQLJSON,
      },
      userFields: {
        type: GraphQLJSON,
      },
    }),
  }),
  resolve: async (parent, args, context: Context) => {
    graphQLAuthCheck(context);
    try {
      return introspectionResult;
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
