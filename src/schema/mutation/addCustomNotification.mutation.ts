import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Application } from '@models';
import { CustomNotificationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import {
  CustomNotificationInputType,
  CustomNotificationArgs,
} from '../inputs/customNotification.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { scheduleCustomNotificationJob } from '../../server/customNotificationScheduler';
import { customNotificationStatus } from '@const/enumTypes';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addCustomNotification mutation */
type AddCustomNotificationArgs = {
  application: string;
  notification: CustomNotificationArgs;
};

/**
 * Mutation to add a new custom notification.
 */
export default {
  type: CustomNotificationType,
  args: {
    application: { type: new GraphQLNonNull(GraphQLID) },
    notification: { type: new GraphQLNonNull(CustomNotificationInputType) },
  },
  async resolve(_, args: AddCustomNotificationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );
      if (ability.cannot('create', 'CustomNotification')) {
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
            status: args.notification.notification_status,
            recipientsType: args.notification.recipientsType,
          },
        },
      };

      const application = await Application.findByIdAndUpdate(
        args.application,
        update,
        { new: true }
      );
      const notificationDetail = application.customNotifications.pop();
      if (
        args.notification.notification_status ===
        customNotificationStatus.active
      ) {
        scheduleCustomNotificationJob(notificationDetail, application);
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
