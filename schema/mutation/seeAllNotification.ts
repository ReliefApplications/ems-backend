import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLList } from "graphql";
import errors from "../../const/errors";
import { NotificationType } from "../types";
import { Notification } from "../../models";

export default {
    /*  Finds all notifications and update them.
        Throws an error if arguments are invalid.
    */
    type: new GraphQLList(NotificationType),
    args: {
        id: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
    },
    async resolve(parent, args, context) {
        if (!args) throw new GraphQLError(errors.invalidSeeAllNotificationArguments);
        const user = context.user;
        if (!user) throw new GraphQLError(errors.userNotLogged);
        await Notification.updateMany({ _id : { $in: args.id }}, { $push: { seenBy: user.id }} );
        return Notification.find({ _id : { $in: args.id }});
    },
}