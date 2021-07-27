import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import deleteContent from '../../services/deleteContent';
import { ApplicationType } from '../types';
import { Application, Page, Role, Channel, Notification, PullJob } from '../../models';
import pubsub from '../../server/pubsub';
import channels from '../../const/channels';
import { AppAbility } from '../../security/defineAbilityFor';
import { unscheduleJob } from '../../server/pullJobScheduler';

export default {
    /*  Deletes an application from its id.
        Recursively delete associated pages and dashboards/workflows.
        Throw GraphQLError if not authorized.
    */
    type: ApplicationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Application.accessibleBy(ability, 'delete').where({_id: args.id}).getFilter();
        const application = await Application.findOneAndDelete(filters);
        if (!application) throw new GraphQLError(errors.permissionNotGranted);
        // Delete pages and content recursively
        if (application.pages.length) {
            for (const pageID of application.pages) {
                const page = await Page.findByIdAndDelete(pageID);
                await deleteContent(page);
            }
        }
        // Delete application's roles
        await Role.deleteMany({application: args.id});
        // Delete application's channels and linked notifications
        const appChannels = await Channel.find({ application: application.id });
        for (const appChannel of appChannels) {
            await Channel.findByIdAndDelete(appChannel);
            await Notification.deleteMany({ channel: appChannel });
        }
        // Delete pullJobs and unschedule them
        await PullJob.deleteMany({ _id: { $in: application.pullJobs } });
        for (const pullJob of application.pullJobs) {
            unscheduleJob(pullJob);
        }
        // Send notification
        const channel = await Channel.findOne({ title: channels.applications });
        const notification = new Notification({
            action: 'Application deleted',
            content: application,
            createdAt: new Date(),
            channel: channel.id,
            seenBy: []
        });
        await notification.save();
        const publisher = await pubsub();
        publisher.publish(channel.id, { notification });
        return application;
    }
}
