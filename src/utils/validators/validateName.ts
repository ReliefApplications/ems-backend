import protectedNames from '@const/protectedNames';
import { GraphQLError } from 'graphql';
import i18nextModule from 'i18next';
import { camelCase, toUpper } from 'lodash';

/** Regex to test if name will be accepted as graphql type name */
const GRAPHQL_TYPE_NAME_REGEX = /^[_a-z]$|^(?:_[a-z0-9]|[a-z]\w)\w*$/i;

/**
 * Transform a string into a GraphQL type name
 *
 * @param name name of form / resource in database
 * @returns name of new GraphQL type
 */
export const getGraphQLTypeName = (name: string): string => {
  return camelCase(name).replace(/^(.)/, toUpper);
};

/**
 * Names from Resources / Forms / Reference Data are transferred into a graphQL Type, so they should not clash with existing types.
 *
 * @param {string} name value to test
 * @param i18next i18next module
 */
export const validateGraphQLTypeName = (
  name: string,
  i18next = i18nextModule
): void => {
  if (!GRAPHQL_TYPE_NAME_REGEX.test(name)) {
    throw new GraphQLError(i18next.t('common.errors.invalidGraphQLName'));
  }
  if (protectedNames.indexOf(name.toLowerCase()) >= 0) {
    throw new GraphQLError(
      i18next.t('utils.validators.validateName.errors.usageOfProtectedName')
    );
  }
};

/**
 * Fields are transferred into a graphQL field names, so they should be valid names.
 *
 * @param {string} name value to test
 * @param i18next i18next module
 */
export const validateGraphQLFieldName = (
  name: string,
  i18next = i18nextModule
): void => {
  if (!GRAPHQL_TYPE_NAME_REGEX.test(name)) {
    throw new GraphQLError(
      i18next.t('utils.validators.validateName.errors.invalidFieldName', {
        field: name,
        err: i18next.t('common.errors.invalidGraphQLName'),
      })
    );
  }
};
