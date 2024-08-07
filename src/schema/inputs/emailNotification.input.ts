import { EmailDistributionListQuery } from '@models';
import {
  GraphQLInputObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLID,
  GraphQLNonNull,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';

/** Custom Notification type for queries/mutations argument */
export type EmailNotificationArgs = {
  name: string;
  schedule: string;
  notificationType: string;
  applicationId: string | Types.ObjectId;
  datasets: any[];
  emailLayout: any;
  emailDistributionList: EmailDistributionListQuery;
  subscriptionList: string[];
  restrictSubscription: boolean;
  recipientsType: any;
  status: string;
  lastExecution: string;
  lastExecutionStatus: string;
  isDeleted: number;
  isDraft: boolean;
  draftStepper: number;
};

/**
 * Query object representing query executed against DB
 */
export const QueryInputType = new GraphQLInputObjectType({
  name: 'QueryInput',
  fields: () => ({
    name: { type: GraphQLString },
    filter: { type: GraphQLJSON },
    fields: { type: new GraphQLList(GraphQLJSON) },
  }),
});

/**
 * Dataset object containing resource and query, used to fetch data
 */
export const DatasetInputType = new GraphQLInputObjectType({
  name: 'DatasetInput',
  fields: () => ({
    resource: { type: GraphQLString },
    name: { type: GraphQLString },
    query: { type: QueryInputType },
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
 * Used to source emails for cc and bcc. Can be a resource query, a static list, or both
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const DistributionListSourceType = new GraphQLInputObjectType({
  name: 'DistributionListSourceType',
  fields: () => ({
    resource: { type: GraphQLID },
    query: { type: QueryInputType },
    inputEmails: { type: new GraphQLList(GraphQLString) },
  }),
});

/**
 * Schema representing configured distribution list; name and to fields are required
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
const EmailNotificationDistributionListType = new GraphQLInputObjectType({
  name: 'EmailNotificationDistributionListType',
  fields: () => ({
    name: {
      type: GraphQLString,
    },
    to: {
      type: DistributionListSourceType,
    },
    cc: {
      type: DistributionListSourceType,
    },
    bcc: {
      type: DistributionListSourceType,
    },
  }),
});

/** GraphQL custom notification query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailNotificationInputType = new GraphQLInputObjectType({
  name: 'EmailNotificationInputType',
  fields: () => ({
    name: { type: GraphQLString },
    schedule: { type: GraphQLString },
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
    notificationType: { type: GraphQLString },
    datasets: { type: new GraphQLList(DatasetInputType) },
    emailLayout: { type: GraphQLJSON },
    emailDistributionList: {
      type: EmailNotificationDistributionListType,
    },
    subscriptionList: { type: new GraphQLList(GraphQLString) },
    restrictSubscription: { type: GraphQLBoolean },
    recipientsType: { type: GraphQLString },
    status: { type: GraphQLString },
    lastExecution: { type: GraphQLString },
    lastExecutionStatus: { type: GraphQLString },
    isDeleted: { type: GraphQLInt },
    isDraft: { type: GraphQLBoolean },
    draftStepper: { type: GraphQLInt },
  }),
});
