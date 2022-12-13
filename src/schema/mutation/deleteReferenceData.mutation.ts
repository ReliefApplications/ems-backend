import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ReferenceData } from '@models';
import { ReferenceDataType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { buildTypes } from '@utils/schema';

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
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const filters = ReferenceData.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const referenceData = await ReferenceData.findOneAndDelete(filters);
    if (!referenceData) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    // Rebuild schema
    buildTypes();
    return referenceData;
  },
};
