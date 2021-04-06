import { GraphQLInt, GraphQLObjectType, GraphQLString } from "graphql";
import { PositionAttributeCategory, User } from "../../models";
import { PositionAttributeCategoryType } from "./positionAttributeCategory";

export const PositionAttributeType = new GraphQLObjectType({
    name: 'PositionAttribute',
    fields: () => ({
        value: { type: GraphQLString },
        category: {
            type: PositionAttributeCategoryType,
            resolve(parent, args, ctx, info) {
                return PositionAttributeCategory.findById(parent.category);
            }
        },
        userCount: {
            type: GraphQLInt,
            resolve(parent, args) {
                return User.find({ positionAttributes: { $elemMatch: { value: parent.value, category: parent.category } } }).count();
            },
        }
    })
});