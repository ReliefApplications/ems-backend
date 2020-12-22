import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt } from "graphql";
import { Permission, User, Application, Channel } from "../../models";
import { ApplicationType, PermissionType, ChannelType } from ".";

export const RoleType = new GraphQLObjectType({
    name: 'Role',
    fields: () => ({
        id: { type: GraphQLID },
        title: { type: GraphQLString },
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent, args) {
                return Permission.find().where('_id').in(parent.permissions);
            }
        },
        usersCount : {
            type: GraphQLInt,
            resolve(parent, args) {
                return User.find({ roles: parent.id }).count();
            }
        },
        application: {
            type: ApplicationType,
            resolve(parent, args) {
                return Application.findOne( { _id: parent.application } );
            }
        },
        channels: {
            type: new GraphQLList(ChannelType),
            resolve(parent, args) {
                return Channel.find().where('_id').in(parent.channels);
            }
        }
    })
});