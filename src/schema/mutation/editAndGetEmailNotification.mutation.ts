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

/**
 *
 */
interface AddCustomNotificationArgs {
  notification: EmailNotificationArgs;
  id: string | Types.ObjectId;
}

/**
 * Mutation to update an existing custom notification.
 */
export default {
  type: EmailNotificationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    notification: { type: EmailNotificationInputType },
  },
  async resolve(_, args: AddCustomNotificationArgs, context: Context) {
    try {
      graphQLAuthCheck(context);

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
        const updateFields = {
          name: args.notification.name,
          schedule: args.notification.schedule,
          createdBy: {
            name: context.user.name,
            email: context.user.username,
          },
          notificationType: args.notification.notificationType,
          applicationId: args.notification.applicationId,
          dataSets: args.notification.dataSets,
          emailLayout: args.notification.emailLayout,
          recipients: args.notification.recipients,
          status: args.notification.status,
          recipientsType: args.notification.recipientsType,
          lastExecution: args.notification.lastExecution,
          lastExecutionStatus: args.notification.lastExecutionStatus,
          isDeleted: args.notification.isDeleted,
        };

        const updatedData = await EmailNotification.findByIdAndUpdate(
          args.id,
          { $set: updateFields },
          { new: true } // Return the modified document
        );

        return updatedData;
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
