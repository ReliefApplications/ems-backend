import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import i18next from 'i18next';
import { logger } from '@services/logger.service';

/**
 * Builds the Apollo formatError hook.
 *
 * Outside production, errors are returned as Apollo builds them (stack traces included),
 * which helps debugging. In production:
 * - the stack trace and exception details never leave the server;
 * - errors deliberately thrown by resolvers (GraphQLError, translated messages such as
 *   "Permission not granted") keep their message, as the front-end relies on them;
 * - any other error escaping a resolver (a bug, a database failure) is logged with its
 *   stack and replaced by the generic internal server error message.
 *
 * @param isProduction whether the server runs in production
 * @returns formatError hook
 */
export const buildFormatError =
  (isProduction: boolean) =>
  (formattedError: GraphQLFormattedError, error: unknown) => {
    if (!isProduction) {
      return formattedError;
    }
    const { stacktrace, exception, ...extensions } =
      (formattedError.extensions || {}) as any;
    const original = unwrapResolverError(error);
    if (original !== error && !(original instanceof GraphQLError)) {
      // Unexpected error thrown inside a resolver: never expose its message
      logger.error(
        `Unhandled error in GraphQL resolver ${formattedError.path?.join(
          '.'
        )}: ${(original as Error)?.message}`,
        { stack: (original as Error)?.stack }
      );
      return {
        message: i18next.t('common.errors.internalServerError'),
        ...(formattedError.path && { path: formattedError.path }),
        extensions: { ...extensions, code: 'INTERNAL_SERVER_ERROR' },
      };
    }
    return { ...formattedError, extensions };
  };

/**
 * Whether the server runs in production.
 * Read from process.env: config.util.getEnv('NODE_ENV') returns NODE_CONFIG_ENV when it is
 * set (e.g. who-dev, who-prod), so it would never equal 'production' on deployed servers.
 */
export const isProduction = process.env.NODE_ENV === 'production';

/** Apollo formatError hook for the current environment */
export default buildFormatError(isProduction);
