/*  Content of a Page or a Step
 */
import { GraphQLEnumType } from 'graphql';

const objToEnum = (name: any) => {
  return Object.keys(name).reduce((o, key) => {
    return Object.assign(o, { [key]: { value: name[key] } });
  }, {});
};

export const contentType = {
  workflow: 'workflow',
  dashboard: 'dashboard',
  form: 'form',
};

export const ContentEnumType = new GraphQLEnumType({
  name: 'ContentEnumType',
  values: objToEnum(contentType),
});

export const authType = {
  serviceToService: 'service-to-service',
  userToService: 'user-to-service',
};

export const AuthEnumType = new GraphQLEnumType({
  name: 'AuthType',
  values: objToEnum(authType),
});

export const status = {
  active: 'active',
  pending: 'pending',
  archived: 'archived',
};

export const StatusEnumType = new GraphQLEnumType({
  name: 'Status',
  values: objToEnum(status),
});

export const sort = {
  asc: 'asc',
  desc: 'desc',
};

export const SortEnumType = new GraphQLEnumType({
  name: 'Sort',
  values: objToEnum(sort),
});
