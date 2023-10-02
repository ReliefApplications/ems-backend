import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Application } from '@models';
import { ApplicationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { deleteQueue } from '../../server/subscriberSafe';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Delete a subscription.
 * Throw an error if not logged or authorized.
 */
export default {
  type: ApplicationType,
  args: {
    applicationId: { type: new GraphQLNonNull(GraphQLID) },
    routingKey: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      const filters = Application.find(
        accessibleBy(ability, 'update').Application
      )
        .where({ _id: args.applicationId })
        .getFilter();
      const application = await Application.findOne(filters);
      if (!application)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      application.subscriptions = await application.subscriptions.filter(
        (sub) => sub.routingKey !== args.routingKey
      );
      await Application.findByIdAndUpdate(args.applicationId, application, {
        new: true,
      });
      deleteQueue(args.routingKey);
      return application;
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
