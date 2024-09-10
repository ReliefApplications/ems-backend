import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull,
  GraphQLError,
} from 'graphql';
import { ApplicationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import pubsub from '../../server/pubsub';
import { Application } from '@models';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the toggleApplicationLock mutation */
type ToggleApplicationLockArgs = {
  id: string | Types.ObjectId;
  lock: boolean;
};

/**
 * Toggle application lock, to prevent other users to edit the application at the same time.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    lock: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
  async resolve(parent, args: ToggleApplicationLockArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = context.user.ability;
      const filters = Application.find(
        accessibleBy(ability, 'update').Application
      )
        .where({ _id: args.id })
        .getFilter();
      let application = await Application.findOne(filters);
      if (!application) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      const update = {
        lockedBy: args.lock ? user._id : null,
        locked: args.lock,
      };
      application = await Application.findOneAndUpdate(filters, update, {
        new: true,
      });
      const publisher = await pubsub();
      publisher.publish('app_lock', {
        application,
        user: user._id,
      });
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
