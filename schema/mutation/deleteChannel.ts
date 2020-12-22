import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Channel, Notification } from "../../models";
import checkPermission from "../../utils/checkPermission";
import { ChannelType } from "../types";

export default {
    /*  Delete a channel from its id and all linked notifications.
        Throw GraphQL error if permission not granted.
    */
    type: ChannelType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageApplications)) {
            Notification.deleteMany( { channel: args.id } );
            return Channel.findByIdAndDelete(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }

    },
}