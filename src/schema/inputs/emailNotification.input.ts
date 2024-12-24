import { EmailNotificationAttachment } from '@models';
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
  emailLayout: string | Types.ObjectId;
  emailDistributionList: string | Types.ObjectId;
  subscriptionList: string[];
  restrictSubscription: boolean;
  recipientsType: any;
  status: string;
  lastExecution: string;
  lastExecutionStatus: string;
  isDeleted: number;
  isDraft: boolean;
  draftStepper: number;
  attachments: EmailNotificationAttachment;
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
    reference: { type: GraphQLString },
    dataType: { type: GraphQLString },
    name: { type: GraphQLString },
    query: { type: QueryInputType },
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
 * Input type for email notification file details.
 */
export const EmailNotificationFileInputType = new GraphQLInputObjectType({
  name: 'EmailNotificationFileInputType',
  fields: () => ({
    occurrence: {
      type: new GraphQLInputObjectType({
        name: 'OccurrenceInputType',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: GraphQLString },
        },
      }),
    },
    driveId: { type: new GraphQLNonNull(GraphQLString) },
    itemId: { type: new GraphQLNonNull(GraphQLString) },
    fileName: { type: new GraphQLNonNull(GraphQLString) },
    clamAV: { type: GraphQLString },
    fileFormat: { type: GraphQLString },
    versionName: { type: GraphQLString },
    fileSize: { type: new GraphQLNonNull(GraphQLString) },
    documentType: { type: new GraphQLList(GraphQLJSON) },
    documentCategory: { type: new GraphQLList(GraphQLJSON) },
    createdDate: { type: GraphQLString },
    modifiedDate: { type: GraphQLString },
  }),
});

/**
 * Input type for email notification attachment details.
 */
export const EmailNotificationAttachmentInputType = new GraphQLInputObjectType({
  name: 'EmailNotificationAttachmentInputType',
  fields: () => ({
    sendAsAttachment: { type: GraphQLBoolean },
    files: { type: new GraphQLList(EmailNotificationFileInputType) },
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
    emailLayout: { type: GraphQLID },
    emailDistributionList: {
      type: GraphQLID,
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
    attachments: { type: EmailNotificationAttachmentInputType },
  }),
});
