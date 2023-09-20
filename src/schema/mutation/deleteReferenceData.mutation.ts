import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';

/**
 * Delete the passed referenceData if authorized.
 * Throws an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;
      const filters = ReferenceData.find(
        accessibleBy(ability, 'delete').ReferenceData
      )
        .where({ _id: args.id })
        .getFilter();
      const referenceData = await ReferenceData.findOneAndDelete(filters);
      if (!referenceData) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      return referenceData;
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
