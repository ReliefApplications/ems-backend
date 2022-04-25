import { GraphQLEnumType } from 'graphql';

/**
 * Transform an enum type into GraphQL enum type values.
 *
 * @param name Enum name
 * @returns GraphQL values for enum type.
 */
const objToEnum = (name: any) => {
  return Object.keys(name).reduce((o, key) => {
    return Object.assign(o, { [key]: { value: name[key] } });
  }, {});
};

/**
 * Available content types.
 */
export const contentType = {
  workflow: 'workflow',
  dashboard: 'dashboard',
  form: 'form',
};

/**
 * GraphQL enum type of content types.
 */
export const ContentEnumType = new GraphQLEnumType({
  name: 'ContentEnumType',
  values: objToEnum(contentType),
});

/**
 * Enum of authentication types.
 */
export const authType = {
  public: 'public',
  serviceToService: 'service-to-service',
  userToService: 'user-to-service',
};

/**
 * Graph enum type of authentication types.
 */
export const AuthEnumType = new GraphQLEnumType({
  name: 'AuthType',
  values: objToEnum(authType),
});

/**
 * Enum of available statuses.
 */
export const status = {
  active: 'active',
  pending: 'pending',
  archived: 'archived',
};

/**
 * GraphQL enum type of available statuses.
 */
export const StatusEnumType = new GraphQLEnumType({
  name: 'Status',
  values: objToEnum(status),
});

/**
 * Enum of reference data type.
 */
export const referenceDataType = {
  static: 'static',
  graphQL: 'graphql',
  rest: 'rest',
};

/**
 * GraphQL Enum type of reference data type.
 */
export const ReferenceDataTypeEnumType = new GraphQLEnumType({
  name: 'ReferenceDataType',
  values: objToEnum(referenceDataType),
});
