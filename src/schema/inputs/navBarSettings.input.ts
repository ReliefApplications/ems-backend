import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
} from 'graphql';

/**
 * Nav Bar settings input type definition
 */
export const NavBarSettingsInputType = new GraphQLInputObjectType({
  name: 'NavBarSettingsInputType',
  fields: () => ({
    showName: { type: new GraphQLNonNull(GraphQLBoolean) },
    showIcon: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});
