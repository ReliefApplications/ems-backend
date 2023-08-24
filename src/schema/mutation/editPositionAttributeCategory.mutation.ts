import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Application, PositionAttributeCategory } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeCategoryType } from '../types';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Edit a position attribute category.
 * Throw GraphQL error if permission not granted.
 */
export default {
  type: PositionAttributeCategoryType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      const ability: AppAbility = context.user.ability;
      const application = await Application.findById(args.application);
      if (!application)
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      if (ability.can('update', application)) {
        return await PositionAttributeCategory.findByIdAndUpdate(
          args.id,
          {
            title: args.title,
          },
          { new: true }
        );
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
