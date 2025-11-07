import { GraphQLBoolean, GraphQLObjectType } from 'graphql';

/**
 * GraphQL nav bar settings type definition
 * Used in StepType and PageType
 */
export const NavBarSettingsType = new GraphQLObjectType({
  name: 'NavBarSettings',
  fields: () => ({
    showName: {
      type: GraphQLBoolean,
    },
    showIcon: {
      type: GraphQLBoolean,
    },
  }),
});
