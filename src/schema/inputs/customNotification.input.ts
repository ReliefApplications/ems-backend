import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';

/** Custom Notification type for queries/mutations argument */
export type CustomNotificationArgs = {
  name: string;
  description?: string;
  schedule?: string;
  notificationType: string;
  resource: string | Types.ObjectId;
  layout: string | Types.ObjectId;
  template: string | Types.ObjectId;
  recipients: string;
  recipientsType: string;
  onRecordCreation?: boolean;
  onRecordUpdate?: boolean;
  applicationTrigger?: boolean;
  status?: string;
  redirect?: {
    active: boolean;
    type: string; // 'url' | 'recordIds'
    url?: string;
    recordIds?: string[];
  };
};

/** GraphQL custom notification query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CustomNotificationInputType = new GraphQLInputObjectType({
  name: 'CustomNotificationInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    schedule: { type: GraphQLString },
    notificationType: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLID) },
    layout: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(GraphQLID) },
    recipients: { type: new GraphQLNonNull(GraphQLString) },
    recipientsType: { type: new GraphQLNonNull(GraphQLString) },
    onRecordCreation: { type: GraphQLBoolean },
    onRecordUpdate: { type: GraphQLBoolean },
    applicationTrigger: { type: GraphQLBoolean },
    status: { type: new GraphQLNonNull(GraphQLString) },
    redirect: { type: GraphQLJSON },
  }),
});
