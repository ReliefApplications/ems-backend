import { GraphQLEnumType } from 'graphql';

/**
 * Transform an enum type into GraphQL enum type values.
 * Gets an object that has each key of the specified object,
 * the values for each key is an object with a single field 'value',
 * that has the value of the object at that key
 *
 * @param name Object
 * @returns The transformed object
 */
const objToEnum = (name: any) => {
  return Object.keys(name).reduce((o, key) => {
    return Object.assign(o, { [key]: { value: name[key] } });
  }, {});
};

/** Page Content types */
export const contentType = {
  workflow: 'workflow',
  dashboard: 'dashboard',
  form: 'form',
};

/** ContentType type for queries/mutations argument */
export type ContentType = keyof typeof contentType;

/** GraphQL content enum type definition */
export const ContentEnumType = new GraphQLEnumType({
  name: 'ContentEnumType',
  values: objToEnum(contentType),
});

/** Auth types */
export const authType = {
  public: 'public',
  serviceToService: 'service-to-service',
  userToService: 'user-to-service',
  authorizationCode: 'authorization-code',
};

/** AuthType type for queries/mutations argument */
export type AuthType = keyof typeof authType;

/** GraphQL auth enum type definition */
export const AuthEnumType = new GraphQLEnumType({
  name: 'AuthType',
  values: objToEnum(authType),
});

/** Possible status */
export const status = {
  active: 'active',
  pending: 'pending',
  archived: 'archived',
};

/** StatusType type for queries/mutations argument */
export type StatusType = keyof typeof status;

/** GraphQL status enum type definition */
export const StatusEnumType = new GraphQLEnumType({
  name: 'Status',
  values: objToEnum(status),
});

/**
 * Enum of reference data type.
 */
export const referenceDataType = {
  static: 'static',
  graphql: 'graphql',
  rest: 'rest',
};

/** ReferenceDataType type for queries/mutations arguments*/
export type ReferenceDataArgsType = keyof typeof referenceDataType;

/**
 * GraphQL Enum type of reference data type.
 */
export const ReferenceDataTypeEnumType = new GraphQLEnumType({
  name: 'ReferenceDataType',
  values: objToEnum(referenceDataType),
});

/**
 * Enum of custom notification status.
 */
export const customNotificationStatus = {
  active: 'active',
  pending: 'pending',
  archived: 'archived',
};

/**
 * Enum of custom notification recipients type.
 */
export const customNotificationRecipientsType = {
  email: 'email',
  userField: 'userField',
  emailField: 'userField',
  distributionList: 'distributionList',
  channel: 'channel',
};

/**
 * Enum of custom notification type.
 */
export const customNotificationType = {
  email: 'email',
  notification: 'notification',
};

/**
 * Enum of custom notification execution status.
 */
export const customNotificationLastExecutionStatus = {
  success: 'success',
  error: 'error',
  process: 'process',
  pending: 'pending',
};

/**
 * Enum of geospatial data type.
 */
export const geospatialType = {
  Point: 'Point',
  LineString: 'LineString',
  Polygon: 'Polygon',
};

/**
 * GraphQL Enum of geospatial data type.
 */
export const GeospatialEnumType = new GraphQLEnumType({
  name: 'GeospatialType',
  values: objToEnum(geospatialType),
});

/** Possible layer type */
export const layerType = {
  featureLayer: 'FeatureLayer',
};

/** GraphQL layer type enum definition */
export const LayerTypeEnum = new GraphQLEnumType({
  name: 'LayerType',
  values: objToEnum(layerType),
});
