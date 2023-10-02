import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';
import { Types } from 'mongoose';

/** Custom Notification type for queries/mutations argument */
export type CustomNotificationArgs = {
  name: string;
  description?: string;
  schedule: string;
  notificationType: string;
  resource: string | Types.ObjectId;
  layout: string | Types.ObjectId;
  template: string | Types.ObjectId;
  recipients: string;
  recipientsType: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  notification_status?: string;
};

/** GraphQL custom notification query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CustomNotificationInputType = new GraphQLInputObjectType({
  name: 'CustomNotificationInputType',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    schedule: { type: new GraphQLNonNull(GraphQLString) },
    notificationType: { type: new GraphQLNonNull(GraphQLString) },
    resource: { type: new GraphQLNonNull(GraphQLID) },
    layout: { type: new GraphQLNonNull(GraphQLID) },
    template: { type: new GraphQLNonNull(GraphQLID) },
    recipients: { type: new GraphQLNonNull(GraphQLString) },
    recipientsType: { type: new GraphQLNonNull(GraphQLString) },
    // notification_status: { type: new GraphQLNonNull(GraphQLString) },
  }),
});
