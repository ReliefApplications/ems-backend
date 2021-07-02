import { GraphQLInputObjectType, GraphQLNonNull, GraphQLString } from 'graphql';

export const UserInputType = new GraphQLInputObjectType({
    name: 'UserInputType',
    fields: () => ({
        email: { type: new GraphQLNonNull(GraphQLString) }
    })
});
