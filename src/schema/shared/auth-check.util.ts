import { GraphQLError } from 'graphql';

/**
 * Authentication check done in GraphQL requests to determine if user is connected or not
 *
 * @param context GraphQLContext (todo: type)
 */
export const graphQLAuthCheck = (context: any) => {
  // Authentication check
  const user = context.user;
  if (!user) {
    throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
  }
};

export default graphQLAuthCheck;
