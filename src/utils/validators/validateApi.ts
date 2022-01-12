import errors from '../../const/errors';
import { GraphQLError } from 'graphql';

/**
 * Checks that API name is valid.
 * @param name value to test
 */
export const validateApi = (name: string): void => {
  if (!/^[A-Za-z-_]+$/i.test(name)) {
    throw new GraphQLError(errors.invalidAddApplicationName);
  }
};
