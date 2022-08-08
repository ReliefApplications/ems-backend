import protectedNames from '../../const/protectedNames';
import { GraphQLError } from 'graphql';
import { camelCase } from 'lodash';
import i18nextModule from 'i18next';

/**
 * Check if a string can be used as a graphql type name.
 * Throws an error if not.
 *
 * @param {string} name value to test
 * @param i18next The i18next module
 */
export const validateGraphQLTypeName = (
  name: string,
  i18next = i18nextModule
): void => {
  // Check if the name respects the graphql type name format
  // Source of the regex: https://spec.graphql.org/October2021/#sec-Names
  const graphQLValidator = /^[_a-z]$|^(?:_[a-z0-9]|[a-z]\w)\w*$/i;
  if (!graphQLValidator.test(name)) {
    throw new GraphQLError(i18next.t('errors.invalidGraphQLName'));
  }
  // Check if the name is not already used for standard types
  if (protectedNames.indexOf(name.toLowerCase()) >= 0) {
    throw new GraphQLError(i18next.t('errors.usageOfProtectedName'));
  }
};

/**
 * Convert a string to PascalCase for graphQL.
 * Throws an error if the string cannot be converted to a GraphQL name.
 * Support most of the characters (accents, punctuations...)
 *
 * @param name The texte to convert
 * @param i18next The i18next module
 * @returns The converted text
 */
export const toGraphQLCase = (
  name: string,
  i18next = i18nextModule
): string => {
  const camelCaseName = camelCase(name);
  const pascalCaseName = camelCaseName
    ? camelCaseName[0].toUpperCase() + camelCaseName.slice(1)
    : '';
  validateGraphQLTypeName(pascalCaseName, i18next);
  return pascalCaseName;
};

/**
 * Names from Applications / Resources / Forms are transferred into a graphQL Type,
 * so they should not clash with existing types.
 * This method tries to convert it to a graphqlType name to check it is possible.
 *
 * @param {string} name value to test
 * @param i18next The i18next module
 */
export const validateName = (name: string, i18next = i18nextModule): void => {
  toGraphQLCase(name, i18next);
};
