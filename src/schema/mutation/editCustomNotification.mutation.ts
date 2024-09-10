import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { CustomNotificationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import {
  CustomNotificationInputType,
  CustomNotificationArgs,
} from '../inputs/customNotification.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import {
  scheduleCustomNotificationJob,
  unscheduleCustomNotificationJob,
} from '../../server/customNotificationScheduler';
import { customNotificationStatus } from '@const/enumTypes';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editCustomNotification mutation */
type EditCustomNotificationArgs = {
  id: string | Types.ObjectId;
  application: string;
  notification: CustomNotificationArgs;
};

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
  async resolve(_, args: EditCustomNotificationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );
      if (ability.cannot('update', 'CustomNotification')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // Test that the frequency is not too high
      if (args.notification.schedule) {
        // make sure minute is not a wildcard
        const reg = new RegExp('^([0-9]|[1-5][0-9])$');
        if (!reg.test(args.notification.schedule.split(' ')[0])) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.customNotification.add.errors.maximumFrequency'
            )
          );
        }
      }
      // Save custom notification in application
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
          'customNotifications.$.status': args.notification.notification_status,
          'customNotifications.$.recipientsType':
            args.notification.recipientsType,
        },
      };

      const application = await Application.findOneAndUpdate(
        { _id: args.application, 'customNotifications._id': args.id },
        update,
        { new: true }
      );

      const notificationDetail = application.customNotifications.find(
        (customNotification) => customNotification.id.toString() === args.id
      );
      if (
        args.notification.notification_status ===
        customNotificationStatus.active
      ) {
        scheduleCustomNotificationJob(notificationDetail, application);
      } else {
        unscheduleCustomNotificationJob(notificationDetail);
      }

      return notificationDetail;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
