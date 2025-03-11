import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Connection } from './pagination.type';

/**
 * GraphQL Template type.
 */
export const CustomNotificationType = new GraphQLObjectType({
  name: 'CustomNotification',
  fields: () => ({
    id: {
      type: GraphQLID,
      resolve(parent) {
        return parent._id ? parent._id : parent.id;
      },
    },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    schedule: { type: GraphQLString },
    notificationType: { type: GraphQLString },
    resource: { type: GraphQLID },
    layout: { type: GraphQLID },
    template: { type: GraphQLID },
    recipients: { type: GraphQLJSON },
    enabled: { type: GraphQLBoolean },
    lastExecution: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    modifiedAt: { type: GraphQLString },
    status: { type: GraphQLString },
    recipientsType: { type: GraphQLString },
    onRecordCreation: { type: GraphQLBoolean },
    onRecordUpdate: { type: GraphQLBoolean },
    applicationTrigger: { type: GraphQLBoolean },
    filter: { type: GraphQLJSON },
    redirect: { type: GraphQLJSON },
  }),
});

/** Custom Notification connection type */
export const CustomNotificationConnectionConnectionType = Connection(
  CustomNotificationType
);
