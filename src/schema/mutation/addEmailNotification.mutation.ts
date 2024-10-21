import { GraphQLError, GraphQLNonNull } from 'graphql';
import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { EmailNotificationType } from '@schema/types/emailNotification.type';
import { EmailNotificationReturn } from '@schema/types/emailNotification.type';
import {
  EmailNotificationArgs,
  EmailNotificationInputType,
} from '@schema/inputs/emailNotification.input';
import extendAbilityForApplications from '@security/extendAbilityForApplication';
import { cloneDeep } from 'lodash';

/** Arguments for the addCustomNotification mutation */
type AddCustomNotificationArgs = {
  notification: EmailNotificationArgs;
};

/**
 * Mutation to add a new custom notification.
 */
export default {
  type: EmailNotificationType,
  args: {
    notification: { type: new GraphQLNonNull(EmailNotificationInputType) },
  },
  async resolve(_, args: AddCustomNotificationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      // if (args.notification.schedule) {
      //   // make sure minute is not a wildcard
      //   const reg = new RegExp('^([0-9]|[1-5][0-9])$');
      //   if (!reg.test(args.notification.schedule.split(' ')[0])) {
      //     throw new GraphQLError(
      //       context.i18next.t(
      //         'mutations.customNotification.add.errors.maximumFrequency'
      //       )
      //     );
      //   }
      // }
      // Only count as a dataset if it has a resource
      const datasetsCount = cloneDeep(args.notification.datasets).filter(
        ({ resource, reference }) => resource || reference
      ).length;
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
      let allSeparate = false;
      if (datasetsCount === individualCount) {
        allSeparate = true;
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
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      const userIsSubscribed = args.notification.subscriptionList.includes(
        context.user.username
      );

      const update = {
        name: args.notification.name,
        schedule: args.notification.schedule,
        createdBy: { name: context.user.name, email: context.user.username },
        applicationId: args.notification.applicationId,
        notificationType: args.notification.notificationType,
        datasets: args.notification.datasets,
        emailLayout: args.notification.emailLayout,
        emailDistributionList: args.notification.emailDistributionList,
        subscriptionList: args.notification.subscriptionList,
        restrictSubscription: args.notification.restrictSubscription,
        status: args.notification.status,
        recipientsType: args.notification.recipientsType,
        lastExecution: args.notification.lastExecution,
        lastExecutionStatus: args.notification.lastExecutionStatus,
        isDraft: args.notification.isDraft,
        draftStepper: args.notification.draftStepper,
      };

      // Check permission to edit an email notification
      const user = context.user;
      const ability = extendAbilityForApplications(
        user,
        args.notification.applicationId.toString()
      );
      if (ability.cannot('create', 'EmailNotification')) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      update.datasets = update.datasets.filter(
        (block) => block.resource !== null || block.reference !== null
      );
      const emailNotification = new EmailNotification(update);
      await emailNotification.save();
      const response = emailNotification as EmailNotificationReturn;
      response.userSubscribed = userIsSubscribed;
      return response;
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
