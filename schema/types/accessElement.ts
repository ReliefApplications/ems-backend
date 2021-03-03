import { GraphQLObjectType, GraphQLList } from "graphql";
import { RoleType } from ".";
import { PositionAttribute, Role } from "../../models";
import { PositionAttributeType } from "./positionAttribute";

export const AccessElementType = new GraphQLObjectType({
    name: 'AccessElement',
    fields: () => ({
        role: {
            type: RoleType,
            resolve(parent, args, ctx, info) {
                return Role.findById(parent.role);
            }
        },
        attributes: {
            type: new GraphQLList(PositionAttributeType),
            resolve(parent, args, ctx, info) {
                return PositionAttribute.find().where('_id').in(parent.attributes);
            }
        }
    })
});