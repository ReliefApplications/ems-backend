import { GraphQLNonNull, GraphQLID, GraphQLError } from "graphql";
import errors from "../../const/errors";
import permissions from "../../const/permissions";
import { Channel, Notification, Role } from "../../models";
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
            await Notification.deleteMany( { channel: args.id } );
            const roles = await Role.find({ channels: args.id });
            for (const role of roles) {
                await Role.findByIdAndUpdate(
                    role.id,
                    { $pull: { channels: args.id } },
                    { new: true}
                );
            }
            return Channel.findByIdAndDelete(args.id);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }

    },
}