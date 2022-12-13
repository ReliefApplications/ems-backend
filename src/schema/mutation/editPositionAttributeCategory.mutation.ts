import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { Application, PositionAttributeCategory } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeCategoryType } from '../types';

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
      return PositionAttributeCategory.findByIdAndUpdate(
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
  },
};
