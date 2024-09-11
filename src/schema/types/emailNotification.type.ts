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
import { EmailNotification } from '@models';

/**
 *
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const QueryType = new GraphQLObjectType({
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
    individualEmailFields: { type: new GraphQLList(GraphQLJSON) },
    pageSize: { type: GraphQLInt },
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
    emailDistributionList: { type: GraphQLID },
    userSubscribed: { type: GraphQLBoolean },
    subscriptionList: { type: new GraphQLList(GraphQLString) },
    restrictSubscription: { type: GraphQLBoolean },
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

/**
 * Graphql return type
 */
export interface EmailNotificationReturn extends EmailNotification {
  userSubscribed: boolean;
}
