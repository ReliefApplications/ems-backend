import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";
import { PositionAttributeCategory } from "../../models";
import { PositionAttributeCategoryType } from "./positionAttributeCategory";

export const PositionAttributeType = new GraphQLObjectType({
    name: 'PositionAttribute',
    fields: () => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        category: { 
            type: PositionAttributeCategoryType,
            resolve(parent, args, ctx, info) {
                return PositionAttributeCategory.findById(parent.category);
            }
        }
    }),
});