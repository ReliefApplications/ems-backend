import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/** GraphQL Input Type of ButtonAction */
const ButtonActionInputType = new GraphQLInputObjectType({
  name: 'ButtonActionInputType',
  fields: () => ({
    text: { type: new GraphQLNonNull(GraphQLString) },
    // Display
    variant: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    // Role restriction
    hasRoleRestriction: { type: new GraphQLNonNull(GraphQLBoolean) },
    roles: {
      type: new GraphQLList(GraphQLString),
    },
    // Navigation
    href: { type: GraphQLString },
    openInNewTab: { type: GraphQLBoolean },
    previousPage: { type: GraphQLBoolean },
    // Edit Record
    editRecord: {
      type: new GraphQLInputObjectType({
        name: 'EditRecordInputType',
        fields: {
          template: { type: GraphQLString },
          reloadDashboard: { type: GraphQLBoolean },
        },
      }),
    },
    // Add Record
    addRecord: {
      type: new GraphQLInputObjectType({
        name: 'AddRecordInputType',
        fields: {
          resource: { type: GraphQLString },
          template: { type: GraphQLString },
          fieldsForUpdate: { type: new GraphQLList(GraphQLString) },
          reloadDashboard: { type: GraphQLBoolean },
        },
      }),
    },
    // Notifications
    subscribeToNotification: {
      type: new GraphQLInputObjectType({
        name: 'subscribeToNotificationInputType',
        fields: {
          notification: { type: GraphQLString },
          template: { type: GraphQLString },
          fieldsForUpdate: { type: new GraphQLList(GraphQLString) },
        },
      }),
    },
  }),
});

export default ButtonActionInputType;
