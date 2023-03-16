import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ApplicationType } from '../types';
import { Application, Channel, Notification } from '@models';
import pubsub from '../../server/pubsub';
import channels from '@const/channels';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Deletes an application from its id.
 * Recursively delete associated pages and dashboards/workflows.
 * Throw GraphQLError if not authorized.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    // Delete the application
    const ability: AppAbility = context.user.ability;
    const filters = Application.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const application = await Application.findOneAndDelete(filters);
    if (!application)
      throw new GraphQLError('common.errors.permissionNotGranted');
    // Send notification
    const channel = await Channel.findOne({ title: channels.applications });
    const notification = new Notification({
      action: 'Application deleted',
      content: application,
      //createdAt: new Date(),
      channel: channel.id,
      seenBy: [],
    });
    await notification.save();
    const publisher = await pubsub();
    publisher.publish(channel.id, { notification });
    return application;
  },
};
