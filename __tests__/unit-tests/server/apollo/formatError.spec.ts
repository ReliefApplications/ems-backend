import { GraphQLError } from 'graphql';
import { logger } from '@services/logger.service';
import { buildFormatError } from '@server/apollo/formatError';

jest.mock('@services/logger.service');
jest.mock('i18next', () => ({
  t: jest.fn((key: string) => key),
}));

/**
 * Builds the pair Apollo passes to formatError for an error thrown by a resolver:
 * graphql-js wraps the thrown error in a located GraphQLError.
 *
 * @param thrown error thrown by the resolver
 * @returns formatted error and located error
 */
const fromResolver = (thrown: Error) => {
  const located = new GraphQLError(thrown.message, {
    originalError: thrown,
    path: ['records', 0, 'owner'],
  });
  const formatted = {
    message: thrown.message,
    path: located.path,
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      stacktrace: ['Error: boom', '    at resolver (file.ts:1:1)'],
    },
  };
  return { formatted, located };
};

describe('Apollo formatError (L-06)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns errors untouched outside production', () => {
    const { formatted, located } = fromResolver(new Error('db down'));
    expect(buildFormatError(false)(formatted, located)).toBe(formatted);
  });

  describe('in production', () => {
    const formatError = buildFormatError(true);

    it('keeps the message of errors deliberately thrown by resolvers, without the stack trace', () => {
      const { formatted, located } = fromResolver(
        new GraphQLError('common.errors.permissionNotGranted')
      );
      expect(formatError(formatted, located)).toEqual({
        message: 'common.errors.permissionNotGranted',
        path: ['records', 0, 'owner'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('masks unexpected errors thrown by resolvers and logs them', () => {
      const thrown = new Error(
        'MongoServerError: connection to 10.0.0.5 refused'
      );
      const { formatted, located } = fromResolver(thrown);
      const result = formatError(formatted, located);
      expect(result).toEqual({
        message: 'common.errors.internalServerError',
        path: ['records', 0, 'owner'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
      expect(JSON.stringify(result)).not.toContain('10.0.0.5');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('records.0.owner'),
        { stack: thrown.stack }
      );
    });

    it('keeps validation and parsing errors, which carry no resolver path', () => {
      const error = new GraphQLError(
        'Cannot query field "foo" on type "Query".',
        {
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        }
      );
      const formatted = {
        message: error.message,
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED', stacktrace: ['x'] },
      };
      expect(formatError(formatted, error)).toEqual({
        message: 'Cannot query field "foo" on type "Query".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      });
    });

    it('strips exception details as well as the stack trace', () => {
      const error = new GraphQLError('Unauthenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
      const formatted = {
        message: 'Unauthenticated',
        extensions: {
          code: 'UNAUTHENTICATED',
          stacktrace: ['x'],
          exception: { stacktrace: ['y'] },
        },
      };
      expect(formatError(formatted, error)).toEqual({
        message: 'Unauthenticated',
        extensions: { code: 'UNAUTHENTICATED' },
      });
    });
  });
});
