import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const QueryType = new GraphQLObjectType({
  name: 'DatasetQuery',
  fields: () => ({
    name: { type: GraphQLString },
    filter: { type: GraphQLJSON },
    fields: { type: new GraphQLList(GraphQLJSON) },
  }),
});

/**
 * GraphQL DataSet type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DatasetType = new GraphQLObjectType({
  name: 'Dataset',
  fields: () => ({
    name: { type: GraphQLString },
    resource: { type: GraphQLString },
    query: { type: QueryType },
    tableStyle: { type: GraphQLJSON },
    blockType: { type: GraphQLJSON },
    textStyle: { type: GraphQLJSON },
    sendAsAttachment: { type: GraphQLBoolean },
    individualEmail: { type: GraphQLBoolean },
    pageSize: { type: GraphQLInt },
  }),
});

/**
 * Defines filter used as part of distribution list.
 */
export const DistributionListSource = new GraphQLObjectType({
  name: 'DistributionListSource',
  fields: () => ({
    resource: { type: GraphQLString },
    query: { type: QueryType },
    inputEmails: { type: new GraphQLList(GraphQLString) },
  }),
});

/**
 * GraphQL EmailLayout type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const EmailLayoutType = new GraphQLObjectType({
  name: 'EmailLayout',
  fields: () => ({
    subject: { type: GraphQLString },
    header: { type: GraphQLJSON },
    body: { type: GraphQLJSON },
    banner: { type: GraphQLJSON },
    footer: { type: GraphQLJSON },
  }),
});

/**
 * GraphQL Recipients type. (new schema, for general case)
 */
export const EmailDistributionListType = new GraphQLObjectType({
  name: 'EmailDistributionList',
  fields: () => ({
    name: { type: GraphQLString },
    to: { type: DistributionListSource },
    cc: { type: DistributionListSource },
    bcc: { type: DistributionListSource },
  }),
});

/**
 * GraphQL EmailNotification type.
 */
export const EmailNotificationType = new GraphQLObjectType({
  name: 'EmailNotification',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    applicationId: { type: GraphQLID },
    createdBy: { type: GraphQLJSON },
    schedule: { type: GraphQLString },
    notificationType: { type: GraphQLString },
    datasets: { type: new GraphQLList(DatasetType) },
    emailLayout: { type: EmailLayoutType },
    emailDistributionList: { type: EmailDistributionListType },
    lastExecution: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    status: { type: GraphQLString },
    recipientsType: { type: GraphQLString },
    isDeleted: { type: GraphQLInt },
    isDraft: { type: GraphQLBoolean },
    draftStepper: { type: GraphQLInt },
  }),
});

/** Email Notification connection type */
export const EmailNotificationConnectionType = Connection(
  EmailNotificationType
);
