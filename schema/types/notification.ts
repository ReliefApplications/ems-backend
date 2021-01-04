import { GraphQLObjectType, GraphQLString, GraphQLID } from "graphql";
import GraphQLJSON from "graphql-type-json";
import { Channel, User } from "../../models";
import { ChannelType } from "./channel";
import { UserType } from "./user";

export const NotificationType = new GraphQLObjectType({
    name: 'Notification',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent, args) {
                return parent._id;
            }
        },
        action: { type: GraphQLString },
        content: { type: GraphQLJSON },
        createdAt: { type: GraphQLString },
        channel: {
            type: ChannelType,
            resolve(parent, args) {
                return Channel.findById(parent.channel);
            }
        },
        seenBy: {
            type: UserType,
            resolve(parent, args) {
                return User.find({}).where('_id').in(parent.seenBy)
            }
        }
    })
});