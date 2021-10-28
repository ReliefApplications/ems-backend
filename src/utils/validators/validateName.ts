import protectedNames from '../../const/protectedNames';
import errors from '../../const/errors';
import { GraphQLError } from 'graphql';

/**
 * Names from Applications / Resources / Forms are transferred into a graphQL Type, so they should not clash with existing types.
 * @param name value to test
 */
export const validateName = (name: string): void => {
  if (!(/^[a-z0-9\s_-]+$/i.test(name))) {
    throw new GraphQLError(errors.invalidAddApplicationName);
  }
  if (protectedNames.indexOf(name.toLowerCase()) >= 0) {
    throw new GraphQLError(errors.usageOfProtectedName);
  }
};
