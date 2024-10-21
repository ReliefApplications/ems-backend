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
    general: {
      type: new GraphQLInputObjectType({
        name: 'GeneralButtonActionInputType',
        fields: () => ({
          buttonText: { type: new GraphQLNonNull(GraphQLString) },
          hasRoleRestriction: { type: new GraphQLNonNull(GraphQLBoolean) },
          roles: {
            type: new GraphQLList(GraphQLString),
          },
          variant: { type: new GraphQLNonNull(GraphQLString) },
          category: { type: new GraphQLNonNull(GraphQLString) },
        }),
      }),
    },
    action: {
      type: new GraphQLInputObjectType({
        name: 'ActionButtonActionInputType',
        fields: () => ({
          navigateTo: {
            type: new GraphQLInputObjectType({
              name: 'NavigateToButtonActionInputType',
              fields: () => ({
                enabled: { type: new GraphQLNonNull(GraphQLBoolean) },
                previousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
                targetUrl: {
                  type: new GraphQLInputObjectType({
                    name: 'TargetUrlButtonActionInputType',
                    fields: () => ({
                      enabled: { type: new GraphQLNonNull(GraphQLBoolean) },
                      href: { type: new GraphQLNonNull(GraphQLString) },
                      openInNewTab: {
                        type: new GraphQLNonNull(GraphQLBoolean),
                      },
                    }),
                  }),
                },
              }),
            }),
          },
          editRecord: {
            type: new GraphQLInputObjectType({
              name: 'EditRecordButtonActionInputType',
              fields: () => ({
                enabled: { type: new GraphQLNonNull(GraphQLBoolean) },
                template: { type: new GraphQLNonNull(GraphQLString) },
              }),
            }),
          },
          addRecord: { type: new GraphQLNonNull(GraphQLBoolean) },
          suscribeToNotification: { type: new GraphQLNonNull(GraphQLBoolean) },
          sendNotification: { type: new GraphQLNonNull(GraphQLBoolean) },
        }),
      }),
    },
  }),
});

export default ButtonActionInputType;
