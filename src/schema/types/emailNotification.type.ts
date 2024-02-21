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
 * GraphQL Resource type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const ResourceType = new GraphQLObjectType({
  name: 'Resources',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  }),
});

/**
 * GraphQL DataSet type.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const DataSetType = new GraphQLObjectType({
  name: 'DataSet',
  fields: () => ({
    name: { type: GraphQLString },
    resource: { type: ResourceType },
    filter: { type: GraphQLJSON },
    pageSize: { type: GraphQLString },
    fields: { type: new GraphQLList(GraphQLJSON) },
    tableStyle: { type: GraphQLJSON },
    blockType: { type: GraphQLJSON },
    textStyle: { type: GraphQLJSON },
    sendAsAttachment: { type: GraphQLBoolean },
    individualEmail: { type: GraphQLBoolean },
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
 * GraphQL Recipients type.
 */
export const RecipientsType = new GraphQLObjectType({
  name: 'Recipients',
  fields: () => ({
    distributionListName: { type: GraphQLString },
    To: { type: new GraphQLList(GraphQLString) },
    Cc: { type: new GraphQLList(GraphQLString) },
    Bcc: { type: new GraphQLList(GraphQLString) },
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
    dataSets: { type: new GraphQLList(DataSetType) },
    emailLayout: { type: EmailLayoutType },
    recipients: { type: RecipientsType },
    lastExecution: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    status: { type: GraphQLString },
    recipientsType: { type: GraphQLString },
    isDeleted: { type: GraphQLInt },
  }),
});

/** Email Notification connection type */
export const EmailNotificationConnectionType = Connection(
  EmailNotificationType
);
