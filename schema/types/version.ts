import { GraphQLObjectType, GraphQLID, GraphQLString } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { UserType } from "../types";
import { User } from "../../models";

export const VersionType = new GraphQLObjectType({
    name: 'Version',
    fields: () => ({
        id: { type: GraphQLID },
        createdAt: { type: GraphQLString },
        data: { type: GraphQLJSON },
        createdBy: {
            type: UserType,
            resolve(parent) {
                return User.findById(parent.createdBy);
            }
        },
    }),
});