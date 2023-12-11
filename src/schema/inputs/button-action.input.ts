import {
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/** GraphQL Input Type of ButtonAction */
const ButtonActionInputType = new GraphQLInputObjectType({
  name: 'ButtonActionInputType',
  fields: () => ({
    text: { type: new GraphQLNonNull(GraphQLString) },
    href: { type: new GraphQLNonNull(GraphQLString) },
    variant: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    openInNewTab: { type: new GraphQLNonNull(GraphQLBoolean) },
  }),
});

export default ButtonActionInputType;
