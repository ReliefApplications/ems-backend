import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import { NotificationType } from "../types";
import { Notification } from "../../models";

export default {
    /*  Finds notification from its id and update it.
        Throws an error if arguments are invalid.
    */
    type: NotificationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        if (!args) throw new GraphQLError(errors.invalidSeeNotificationArguments);
        const user = context.user;
        if (!user) throw new GraphQLError(errors.userNotLogged);
        return Notification.findByIdAndUpdate(args.id, {
            $push: { seenBy: user.id }
        });
    },
}