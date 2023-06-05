import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Application, PositionAttributeCategory } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeCategoryType } from '../types';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

/**
 * Delete a position attribute category.
 * Throw GraphQL error if permission not granted.
 */
export default {
  type: PositionAttributeCategoryType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = context.user.ability;
      const application = await Application.findById(args.application);
      if (!application)
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.dataNotFound')
        );
      if (ability.can('update', application)) {
        return await PositionAttributeCategory.findByIdAndDelete(args.id);
      } else {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
