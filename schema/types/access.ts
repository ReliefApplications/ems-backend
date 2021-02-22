import { GraphQLObjectType, GraphQLList } from "graphql";
import { AccessElementType } from "./accessElement";
import { RoleType } from ".";
import { Role } from "../../models";

export const AccessType = new GraphQLObjectType({
    name: 'Access',
    fields: () => ({
        // canSee: { type: new GraphQLList(AccessElementType) },
        // canCreate: { type: new GraphQLList(AccessElementType) },
        // canUpdate: { type: new GraphQLList(AccessElementType) },
        // canDelete: { type: new GraphQLList(AccessElementType) }
        canSee: {
            type: new GraphQLList(RoleType),
            resolve(parent, args, ctx, info) {
                return Role.find().where('_id').in(parent.canSee);
            }
        },
        canCreate: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canCreate);
            }
        },
        canUpdate: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canUpdate);
            }
        },
        canDelete: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find().where('_id').in(parent.canDelete);
            }
        }
    })
});