import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
} from 'graphql';

/** GraphQL custom notification query input type definition */
// eslint-disable-next-line @typescript-eslint/naming-convention
const CustomNotificationInputType = new GraphQLInputObjectType({
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

export default CustomNotificationInputType;
