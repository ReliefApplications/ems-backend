import {
  GraphQLError,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { Application, PositionAttributeCategory } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeCategoryType } from '../types';
import { logger } from '@services/logger.service';

/**
 * Add new position attribute category.
 */
export default {
  type: PositionAttributeCategoryType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const application = await Application.findById(args.application);
    if (!application)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    if (ability.can('update', application)) {
      try {
        const category = new PositionAttributeCategory({
          title: args.title,
          application: args.application,
        });
        return await category.save();
      } catch (err) {
        logger.error(err.message, { stack: err.stack });
        throw new GraphQLError(
          context.i18next.t('common.errors.internalServerError')
        );
      }
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
