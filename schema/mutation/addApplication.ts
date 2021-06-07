import { GraphQLNonNull, GraphQLString, GraphQLError } from "graphql";
import errors from "../../const/errors";
import channels from "../../const/channels";
import { Application, Role, Notification, Channel } from "../../models";
import pubsub from "../../server/pubsub";
import validateName from "../../utils/validateName";
import { ApplicationType } from "../types";
import { AppAbility } from "../../security/defineAbilityFor";

export default {
    /*  Creates a new application.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve(parent, args, context) {
        validateName(args.name);
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (ability.can('create', 'Application')) {
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
                    },
                    isLocked: false,
                    isLockedBy: []
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
                    application.permissions.canSee.push(role._id);
                }
                return application;
            }
            throw new GraphQLError(errors.invalidAddApplicationArguments);
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}