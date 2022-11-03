import { GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql';
import { PositionAttributeCategory, User } from '@models';
import { PositionAttributeCategoryType } from './positionAttributeCategory.type';

/** GraphQL position attribute type definition */
export const PositionAttributeType = new GraphQLObjectType({
  name: 'PositionAttribute',
  fields: () => ({
    value: { type: GraphQLString },
    category: {
      type: PositionAttributeCategoryType,
      resolve(parent) {
        return PositionAttributeCategory.findById(parent.category);
      },
    },
    usersCount: {
      type: GraphQLInt,
      resolve(parent) {
        return User.find({
          positionAttributes: {
            $elemMatch: { value: parent.value, category: parent.category },
          },
        }).count();
      },
    },
  }),
});
