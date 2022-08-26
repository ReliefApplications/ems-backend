import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { PositionAttributeInputType } from './position-attribute.input';

/**
 * GraphQL Input Type of User.
 */
const UserInputType = new GraphQLInputObjectType({
  name: 'UserInputType',
  fields: () => ({
    email: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLID) },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  }),
});

export default UserInputType;
