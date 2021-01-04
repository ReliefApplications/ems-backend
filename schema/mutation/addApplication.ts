import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import channels from "../../const/channels";
import permissions from "../../const/permissions";
import { Application, Role, Notification, Channel } from "../../models";
import pubsub from "../../server/pubsub";
import checkPermission from "../../utils/checkPermission";
import { ApplicationType } from "../types";

export default {
    /*  Creates a new application.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (checkPermission(user, permissions.canManageApplications)) {
            if (args.name !== '') {
                const application = new Application({
                    name: args.name,
                    createdAt: new Date(),
                    status: 'pending',
                    createdBy: user.id,
                    permissions: {
                        canSee: [],
                        canCreate: [],
                        canUpdate: [],
                        canDelete: []
                    }
                });
                await application.save();
                // Send notification
                const channel = await Channel.findOne({ title: channels.applications });
                const notification = new Notification({
                    action: 'Application created',
                    content: application,
                    createdAt: new Date(),
                    channel: channel.id,
                    seenBy: []
                });
                await notification.save();
                const publisher = await pubsub();
                publisher.publish(channel.id, { notification });
                // Create main channel
                const mainChannel = new Channel({
                    title: 'main',
                    application: application._id
                })
                await mainChannel.save();
                // Create roles
                for (const name of ['Editor', 'Manager', 'Guest']) {
                    const role = new Role({
                        title: name,
                        application: application.id,
                        channels: [mainChannel._id]
                    });
                    await role.save();
                }
                return application;
            }
            throw new GraphQLError(errors.invalidAddApplicationArguments);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}