import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { CustomNotificationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import CustomNotificationInputType from '../inputs/customNotification.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/**
 * Mutation to add a new custom notification.
 */
export default {
  type: CustomNotificationType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    notification: { type: new GraphQLNonNull(CustomNotificationInputType) },
  },
  async resolve(_, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = extendAbilityForApplications(
      user,
      args.application
    );
    if (ability.cannot('create', 'CustomNotification')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const update = {
      $addToSet: {
        customNotifications: {
          name: args.notification.name,
          description: args.notification.description,
          schedule: args.notification.schedule,
          notificationType: args.notification.notificationType,
          resource: args.notification.resource,
          layout: args.notification.layout,
          template: args.notification.template,
          recipients: args.notification.recipients,
          status: 'pending',
        },
      },
    };

    const application = await Application.findByIdAndUpdate(
      args.application,
      update,
      { new: true }
    );

    return application.customNotifications.pop();
  },
};
