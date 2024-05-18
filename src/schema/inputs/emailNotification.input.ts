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
  emailDistributionList: string;
  recipientsType: any;
  status: string;
  lastExecution: string;
  lastExecutionStatus: string;
  isDeleted: number;
  isDraft: boolean;
  draftStepper: number;
};

/** GraphQL custom notification query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const EmailNotificationInputType = new GraphQLInputObjectType({
  name: 'EmailNotificationInputType',
  fields: () => ({
    name: { type: GraphQLString },
    schedule: { type: GraphQLString },
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
    notificationType: { type: GraphQLString },
    datasets: { type: new GraphQLList(GraphQLJSON) },
    emailLayout: { type: GraphQLJSON },
    emailDistributionList: { type: GraphQLJSON },
    recipientsType: { type: GraphQLString },
    status: { type: GraphQLString },
    lastExecution: { type: GraphQLString },
    lastExecutionStatus: { type: GraphQLString },
    isDeleted: { type: GraphQLInt },
    isDraft: { type: GraphQLBoolean },
    draftStepper: { type: GraphQLInt },
  }),
});
