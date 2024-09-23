import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLObjectType,
  GraphQLBoolean,
  GraphQLString,
} from 'graphql';
import { EmailNotification } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/** Arguments for the deleteEmailNotification mutation */
type DeleteEmailNotificationArgs = {
  id: string | Types.ObjectId;
  applicationId: string;
};

/** Response type for the deleteEmailNotification mutation */
const deleteEmailNotificationResponseType = new GraphQLObjectType({
  name: 'DeleteEmailNotificationResponse',
  fields: {
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    message: { type: new GraphQLNonNull(GraphQLString) },
  },
});

/**
 * Delete an email notification by its ID.
 * Throws an error if not logged in, not authorized, or if arguments are invalid.
 */
export default {
  type: deleteEmailNotificationResponseType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: DeleteEmailNotificationArgs, context: Context) {
    // Check if the user is authenticated
    graphQLAuthCheck(context);

    try {
      const ability: AppAbility = extendAbilityForApplications(
        context.user,
        args.applicationId
      );
      let emailNotification = null;

      logger.info(`Attempting to delete EmailNotification with ID: ${args.id}`);

      // Check if the user has permission to delete the email notification
      if (ability.can('delete', 'EmailNotification')) {
        emailNotification = await EmailNotification.findOneAndDelete({
          _id: args.id,
          applicationId: args.applicationId,
        });
      } else {
        // Handle cases where the user has limited permissions
        const accessibleEmailNotification = await EmailNotification.findOne({
          _id: args.id,
          applicationId: args.applicationId,
          ...accessibleBy(ability, 'delete').EmailNotification,
        });

        if (accessibleEmailNotification) {
          emailNotification = await EmailNotification.findOneAndDelete({
            _id: args.id,
            applicationId: args.applicationId,
          });
        }
      }

      if (!emailNotification) {
        const message = `Permission not granted or EmailNotification not found for ID: ${args.id}`;
        logger.warn(message);
        return { success: false, message };
      }

      logger.info(`EmailNotification with ID: ${args.id} successfully deleted`);
      return {
        success: true,
        message: 'Email notification deleted successfully.',
      };
    } catch (err) {
      logger.error(
        `Error deleting EmailNotification with ID: ${args.id} - ${err.message}`,
        { stack: err.stack }
      );
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
