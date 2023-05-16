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
};

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
  distributionList: 'distributionList',
};

/**
 * Enum of custom notification type.
 */
export const customNotificationType = {
  email: 'email',
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

/** Possible status dashboard, page, step and workflow type*/
export const statusType = {
  active: 'active',
  archived: 'archived',
};

/** GraphQL status dashboard, page, step and workflow enum type definition */
export const StatusTypeEnumType = new GraphQLEnumType({
  name: 'StatusType',
  values: objToEnum(statusType),
});
