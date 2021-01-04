import { GraphQLError, GraphQLList } from "graphql";
import errors from "../../const/errors";
import mongoose from 'mongoose';
import { NotificationType } from "../types";
import { Notification } from "../../models";

export default {
    /*  Returns all the notifications corresponding to the channels subscribes by the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(NotificationType),
    resolve(parent, args, context) {
        const user = context.user;
        if (!user) throw new GraphQLError(errors.userNotLogged);
        const filters = {
            channel: { $in: context.user.roles.map(role => role.channels.map(x => mongoose.Types.ObjectId(x._id))).flat()},
            seenBy: { $ne: user.id }
        }
        return Notification.find(filters).sort({ createdAt: -1 });
    }
}