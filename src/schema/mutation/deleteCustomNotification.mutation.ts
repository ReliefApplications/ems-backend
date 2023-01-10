import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { CustomNotificationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { unscheduleCustomNotificationJob } from '../../server/customNotificationScheduler';

/**
 * Mutation to delete custom notification.
 */
export default {
  type: CustomNotificationType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = extendAbilityForApplications(
      user,
      args.application
    );
    if (ability.cannot('delete', 'CustomNotification')) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    const update = {
      $pull: { customNotifications: { _id: args.id } },
    };

    const application = await Application.findByIdAndUpdate(
      args.application,
      update
    );

    const notificationDetail = application.customNotifications.find(
      (x) => x.id.toString() === args.id
    );

    unscheduleCustomNotificationJob(notificationDetail);

    return notificationDetail;
  },
};
