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
    hasRoleRestriction: { type: new GraphQLNonNull(GraphQLBoolean) },
    roles: {
      type: new GraphQLList(GraphQLString),
    },
    variant: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    href: { type: GraphQLString },
    openInNewTab: { type: GraphQLBoolean },
    previousPage: { type: GraphQLBoolean },
    resource: { type: GraphQLString },
    template: { type: GraphQLString },
    recordFields: { type: new GraphQLList(GraphQLString) },
  }),
});

export default ButtonActionInputType;
