import { GraphQLID, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { PositionAttributeInputType } from './position-attribute';

/**
 * GraphQL Input Type of User.
 */
const UserInputType = new GraphQLInputObjectType({
    name: 'UserInputType',
    fields: () => ({
        email: { type: new GraphQLNonNull(GraphQLString) },
        roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
        attributes: { type: new GraphQLList(PositionAttributeInputType) }
    })
});

export default UserInputType;
