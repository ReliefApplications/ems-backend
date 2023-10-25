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
      async resolve(parent) {
        const category = await PositionAttributeCategory.findById(
          parent.category
        );
        return category;
      },
    },
    usersCount: {
      type: GraphQLInt,
      async resolve(parent) {
        const count = await User.find({
          positionAttributes: {
            $elemMatch: { value: parent.value, category: parent.category },
          },
        }).count();
        return count;
      },
    },
  }),
});
