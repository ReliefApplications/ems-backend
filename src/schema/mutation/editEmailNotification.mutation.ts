import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { EmailNotificationType } from '@schema/types/emailNotification.type';
import {
  EmailNotificationArgs,
  EmailNotificationInputType,
} from '@schema/inputs/emailNotification.input';
import { Types } from 'mongoose';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { AppAbility } from '@security/defineUserAbility';
import { EmailNotificationReturn } from '@schema/types/emailNotification.type';
import { cloneDeep } from 'lodash';

/**
 * Interface for the arguments required to update a custom notification.
 * Represents the notification data, parent application, and notification ID.
 */
interface AddCustomNotificationArgs {
  notification: EmailNotificationArgs;
  application: string;
  id: string | Types.ObjectId;
}

/**
 * Mutation to update an existing custom notification.
 */
export default {
  type: EmailNotificationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
    notification: { type: EmailNotificationInputType },
  },
  async resolve(_, args: AddCustomNotificationArgs, context: Context) {
    try {
      graphQLAuthCheck(context);
      const user = context.user;
      const ability: AppAbility = extendAbilityForApplications(
        user,
        args.application
      );

      // Uncomment the following block if validation is needed for the schedule
      // if (args.notification.schedule) {
      //   const reg = new RegExp('^([0-9]|[1-5][0-9])$');
      //   if (!reg.test(args.notification.schedule.split(' ')[0])) {
      //     throw new GraphQLError(
      //       context.i18next.t('mutations.customNotification.add.errors.maximumFrequency')
      //     );
      //   }
      // }
      if (args.notification) {
        // Can't do this type of type check on type level
        let allSeparate = false;
        // Only count as a dataset if it has a resource
        if (args.notification.datasets) {
          const datasetsCount =
            cloneDeep(args.notification.datasets)?.filter(
              ({ resource, reference }) => resource || reference
            ).length ?? 0;
          // Individual email count
          let individualCount = 0;
          for (const dataset of args.notification.datasets) {
            if (
              (dataset.resource || dataset.reference) &&
              dataset.individualEmail
            ) {
              individualCount += 1;
            }
          }
          if (datasetsCount === individualCount) {
            allSeparate = true;
          }
        }

        if (
          !(args.notification.isDraft || args.notification.isDeleted === 1) &&
          // (!args.notification.emailDistributionList.name ||
          //   (!args.notification.emailDistributionList.to.resource &&
          //     args.notification.emailDistributionList.to.inputEmails.length ===
          //       0)) &&
          !allSeparate &&
          !args.notification.emailDistributionList
        ) {
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        }

        // Check if user is subscribed to the notification
        const userIsSubscribed = args.notification.subscriptionList?.includes(
          context.user.username
        );
        const updateFields = {
          name: args.notification.name,
          schedule: args.notification.schedule,
          createdBy: {
            name: context.user.name,
            email: context.user.username,
          },
          notificationType: args.notification.notificationType,
          applicationId: args.notification.applicationId,
          datasets: args.notification.datasets,
          emailLayout: args.notification.emailLayout,
          emailDistributionList: args.notification.emailDistributionList,
          subscriptionList: args.notification.subscriptionList,
          restrictSubscription: args.notification.restrictSubscription,
          status: args.notification.status,
          recipientsType: args.notification.recipientsType,
          lastExecution: args.notification.lastExecution,
          lastExecutionStatus: args.notification.lastExecutionStatus,
          isDeleted: args.notification.isDeleted,
          isDraft: args.notification.isDraft,
          draftStepper: args.notification.draftStepper,
        };

        // Check permission to edit an email notification
        if (ability.cannot('update', 'EmailNotification')) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }

        const updatedData = await EmailNotification.findByIdAndUpdate(
          args.id,
          { $set: updateFields },
          { new: true } // Return the modified document
        );
        const response = updatedData as EmailNotificationReturn;
        response.userSubscribed = userIsSubscribed;
        return response;
      } else {
        const emailNotification = await EmailNotification.findById(args.id);
        return emailNotification;
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });

      if (err instanceof GraphQLError) {
        throw err;
      }

      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
