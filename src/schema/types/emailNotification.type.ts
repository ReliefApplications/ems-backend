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
 * Dataset Query type - used to define a query for a dataset.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const QueryType = new GraphQLObjectType({
  name: 'DatasetQuery',
  fields: () => ({
    name: { type: GraphQLString },
    filter: { type: GraphQLJSON },
    fields: {
      type: new GraphQLList(GraphQLJSON),
      resolve: (parent) => parent?.fields ?? [],
    },
  }),
});

/**
 * GraphQL Dataset type. Represents a data block in the email.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const DatasetType = new GraphQLObjectType({
  name: 'Dataset',
  fields: () => ({
    name: { type: GraphQLString },
    resource: { type: GraphQLString },
    reference: { type: GraphQLString },
    query: { type: QueryType },
    tableStyle: { type: GraphQLJSON },
    blockType: { type: GraphQLJSON },
    textStyle: { type: GraphQLJSON },
    sendAsAttachment: { type: GraphQLBoolean },
    individualEmail: { type: GraphQLBoolean },
    individualEmailFields: { type: new GraphQLList(GraphQLJSON) },
    pageSize: { type: GraphQLInt },
    navigateToPage: { type: GraphQLBoolean, defaultValue: false },
    navigateSettings: { type: GraphQLJSON },
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
    emailLayout: { type: GraphQLID },
    emailDistributionList: { type: GraphQLID },
    userSubscribed: {
      type: GraphQLBoolean,
      resolve(parent, _, context) {
        return parent.subscriptionList.includes(context.user.username);
      },
    },
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
 * Return type for EmailNotification queries.
 * Extended with `userSubscribed` field (inferred at runtime).
 */
export interface EmailNotificationReturn extends EmailNotification {
  userSubscribed: boolean;
}
