import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Application, PositionAttributeCategory } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeCategoryType } from '../types';

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
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    const application = await Application.findById(args.application);
    if (!application)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    if (ability.can('update', application)) {
      return PositionAttributeCategory.findByIdAndDelete(args.id);
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
