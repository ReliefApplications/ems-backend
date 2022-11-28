import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { CustomNotificationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import CustomNotificationInputType from '../inputs/customNotification.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/**
 * Mutation to edit custom notification.
 */
export default {
  type: CustomNotificationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
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
    if (ability.cannot('update', 'CustomNotification')) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    const update = {
      $set: {
        'customNotifications.$.name': args.notification.name,
        'customNotifications.$.description': args.notification.description,
        'customNotifications.$.schedule': args.notification.schedule,
        'customNotifications.$.notificationType':
          args.notification.notificationType,
        'customNotifications.$.resource': args.notification.resource,
        'customNotifications.$.layout': args.notification.layout,
        'customNotifications.$.template': args.notification.template,
        'customNotifications.$.recipients': args.notification.recipients,
      },
    };

    const application = await Application.findOneAndUpdate(
      { _id: args.application, 'customNotifications._id': args.id },
      update,
      { new: true }
    );

    return application.customNotifications.find(
      (customNotification) => customNotification.id.toString() === args.id
    );
  },
};
