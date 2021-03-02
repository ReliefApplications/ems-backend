import { GraphQLObjectType, GraphQLList } from "graphql";
import { RoleType } from ".";
import { Role } from "../../models";
import GraphQLJSON from "graphql-type-json";

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
        },
        canSeeRecords: {
            type: new GraphQLList(GraphQLJSON)
        },
        canUpdateRecords: {
            type: new GraphQLList(GraphQLJSON)
        },
        canCreateRecords: {
            type: new GraphQLList(GraphQLJSON)
        },
        canDeleteRecords: {
            type: new GraphQLList(GraphQLJSON)
        }
    })
});