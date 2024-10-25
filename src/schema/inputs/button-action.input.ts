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
    href: { type: new GraphQLNonNull(GraphQLString) },
    hasRoleRestriction: { type: new GraphQLNonNull(GraphQLBoolean) },
    roles: {
      type: new GraphQLList(GraphQLString),
    },
    variant: { type: new GraphQLNonNull(GraphQLString) },
    category: { type: new GraphQLNonNull(GraphQLString) },
    openInNewTab: { type: new GraphQLNonNull(GraphQLBoolean) },
    previousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    editRecordTemplate: { type: new GraphQLNonNull(GraphQLString) },
    addRecordResource: { type: new GraphQLNonNull(GraphQLString) },
    addRecordTemplate: { type: new GraphQLNonNull(GraphQLString) },
    editCurrentRecord: { type: new GraphQLNonNull(GraphQLBoolean) },
    attachNewToCurrentFields: {
      type: new GraphQLList(GraphQLString),
    },
  }),
});

export default ButtonActionInputType;
