import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { PositionAttributeInputType } from './position-attribute.input';
import { Types } from 'mongoose';
import { PositionAttribute } from '@models/positionAttribute.model';

/** User type for queries/mutations argument */
export type UserArgs = {
  email: string;
  roles: (string | Types.ObjectId)[];
  positionAttributes?: PositionAttribute[];
};

/**
 * GraphQL Input Type of User.
 */
export const UserInputType = new GraphQLInputObjectType({
  name: 'UserInputType',
  fields: () => ({
    email: { type: new GraphQLNonNull(GraphQLString) },
    roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  }),
});
