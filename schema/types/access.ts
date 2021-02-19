import { GraphQLObjectType, GraphQLList } from "graphql";
import { AccessElementType } from "./accessElement";

export const AccessType = new GraphQLObjectType({
    name: 'Access',
    fields: () => ({
        canSee: { type: new GraphQLList(AccessElementType) },
        canCreate: { type: new GraphQLList(AccessElementType) },
        canUpdate: { type: new GraphQLList(AccessElementType) },
        canDelete: { type: new GraphQLList(AccessElementType) }
    })
});