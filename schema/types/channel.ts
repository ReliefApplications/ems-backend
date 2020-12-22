import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList } from "graphql";
import { Application, Role } from "../../models";
import { ApplicationType } from "./application";
import { RoleType } from "./role";

export const ChannelType = new GraphQLObjectType({
    name: 'Channel',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        application: {
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { _id: parent.application } );
            }
        },
        subscribedRoles: {
            type: new GraphQLList(RoleType),
            resolve(parent, args) {
                return Role.find({ channels: parent._id });
            }
        }
    }),
});