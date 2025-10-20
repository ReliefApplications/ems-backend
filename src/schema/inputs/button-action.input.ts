import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * Send notification action field input type.
 */
const sendNotificationFieldInputType = new GraphQLInputObjectType({
  name: 'sendNotificationFieldInputType',
  fields: () => ({
    // using () => syntax allow recursive mode
    format: { type: GraphQLJSON },
    type: { type: GraphQLString },
    name: { type: GraphQLString },
    kind: { type: GraphQLString },
    label: { type: GraphQLString },
    width: { type: GraphQLInt },
    fields: { type: new GraphQLList(sendNotificationFieldInputType) },
    filter: { type: GraphQLJSON },
    sort: { type: GraphQLJSON },
    first: { type: GraphQLInt },
  }),
});

/** GraphQL Input Type of Action Button */
const ActionButtonInputType = new GraphQLInputObjectType({
  name: 'ActionButtonInputType',
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
          autoReload: { type: GraphQLBoolean },
        },
      }),
    },
    // Clone Record
    cloneRecord: {
      type: new GraphQLInputObjectType({
        name: 'CloneRecordInputType',
        fields: {
          template: { type: GraphQLString },
          autoReload: { type: GraphQLBoolean },
          onSave: {
            type: new GraphQLInputObjectType({
              name: 'CloneRecordOnSaveInputType',
              fields: {
                navigateTo: {
                  type: new GraphQLInputObjectType({
                    name: 'NavigateToOnSaveInputType',
                    fields: {
                      targetUrl: {
                        type: new GraphQLInputObjectType({
                          name: 'NavigateToTargetUrlOnSaveInputType',
                          fields: {
                            href: { type: GraphQLString },
                            openInNewTab: { type: GraphQLBoolean },
                          },
                        }),
                      },
                      targetPage: {
                        type: new GraphQLInputObjectType({
                          name: 'NavigateToTargetPageOnSaveInputType',
                          fields: {
                            pageUrl: { type: GraphQLString },
                            field: { type: GraphQLString },
                          },
                        }),
                      },
                    },
                  }),
                },
              },
            }),
          },
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
          autoReload: { type: GraphQLBoolean },
          mapping: { type: GraphQLJSON },
        },
      }),
    },
    // Notifications
    subscribeToNotification: {
      type: new GraphQLInputObjectType({
        name: 'subscribeToNotificationInputType',
        fields: {
          notification: { type: GraphQLString },
        },
      }),
    },
    unsubscribeFromNotification: {
      type: new GraphQLInputObjectType({
        name: 'unsubscribeFromNotificationInputType',
        fields: {
          notification: { type: GraphQLString },
        },
      }),
    },
    sendNotification: {
      type: new GraphQLInputObjectType({
        name: 'sendNotificationInputType',
        fields: {
          distributionList: { type: GraphQLString },
          templates: { type: new GraphQLList(GraphQLString) },
          fields: {
            type: new GraphQLList(sendNotificationFieldInputType),
          },
        },
      }),
    },
  }),
});

export default ActionButtonInputType;
