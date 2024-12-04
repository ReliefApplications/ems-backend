import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@services/logger.service';
import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Context } from '@server/apollo/context';
import { EmailNotification } from '@models';
import { EmailNotificationType } from '@schema/types';
import { AppAbility } from '@security/defineUserAbility';
import extendAbilityForApplications from '@security/extendAbilityForApplication';

/**
 * Email notification query resolver.
 */
export default {
  type: EmailNotificationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(_, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const notification = await EmailNotification.findById(args.id);
      if (!notification) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const applicationId = notification.applicationId;
      const ability: AppAbility = extendAbilityForApplications(
        context.user,
        applicationId.toString()
      );
      if (ability.can('read', 'EmailNotification')) {
        return notification;
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
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
