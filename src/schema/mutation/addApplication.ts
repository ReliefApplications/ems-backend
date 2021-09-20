import { GraphQLError } from 'graphql';
import errors from '../../const/errors';
import channels from '../../const/channels';
import { Application, Role, Notification, Channel } from '../../models';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import { status } from '../../const/enumTypes';

export default {
    /*  Creates a new application.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApplicationType,
    args: {},
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (ability.can('create', 'Application')) {
            // Find suitable application name
            let appName = '';
            try {
                const duplicates = await Application.findOne({ name: { $regex: new RegExp(/^(Untitled application( \d+)?)$/)}} ).sort('-name').select('name');
                const duplicatesNb = duplicates.name.match(/\d+/) ? Number(duplicates.name.match(/\d+/)[0]) : 0;
                appName = `Untitled application ${duplicatesNb + 1}`;
            } catch {
                appName = 'Untitled application';
            }
            const application = new Application({
                name: appName,
                createdAt: new Date(),
                status: status.pending,
                createdBy: user.id,
                permissions: {
                    canSee: [],
                    canCreate: [],
                    canUpdate: [],
                    canDelete: []
                },
                isLocked: false,
                isLockedBy: ''
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
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
