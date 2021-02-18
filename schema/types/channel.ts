import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList } from "graphql";
import { Application, Role } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
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
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Role.accessibleBy(ability, 'read').find({ channels: parent._id });
            }
        },
        routingKey: {
            type: GraphQLString,
            resolve(parent, args) {
                return `${process.env.RABBITMQ_APPLICATION}.${parent.application}.${parent.id}`;
            }
        }
    }),
});