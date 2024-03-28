import { GraphQLError, GraphQLNonNull } from 'graphql';
import { EmailNotification } from '@models';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { EmailNotificationType } from '@schema/types/emailNotification.type';
import {
  EmailNotificationArgs,
  EmailNotificationInputType,
} from '@schema/inputs/emailNotification.input';

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

      const update = {
        name: args.notification.name,
        schedule: args.notification.schedule,
        createdBy: { name: context.user.name, email: context.user.username },
        applicationId: args.notification.applicationId,
        notificationType: args.notification.notificationType,
        dataSets: args.notification.dataSets,
        emailLayout: args.notification.emailLayout,
        recipients: args.notification.recipients,
        status: args.notification.status,
        recipientsType: args.notification.recipientsType,
        lastExecution: args.notification.lastExecution,
        lastExecutionStatus: args.notification.lastExecutionStatus,
      };
      update.dataSets = update.dataSets.filter(
        (block) => block.resource !== null
      );
      const emailNotification = new EmailNotification(update);
      await emailNotification.save();
      return emailNotification;
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
