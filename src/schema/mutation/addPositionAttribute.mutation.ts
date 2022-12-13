import { GraphQLError, GraphQLNonNull, GraphQLString } from 'graphql';
import { PositionAttribute, PositionAttributeCategory, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeInputType } from '../inputs';
import { UserType } from '../types';

/**
 * Add new position attribute.
 */
export default {
  type: UserType,
  args: {
    user: { type: new GraphQLNonNull(GraphQLString) },
    positionAttribute: { type: new GraphQLNonNull(PositionAttributeInputType) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    const category = await PositionAttributeCategory.findById(
      args.positionAttribute.category
    ).populate('application');
    if (!category)
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    if (ability.cannot('update', category.application, 'users')) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    let modifiedUser = await User.findById(args.user);
    if (modifiedUser) {
      const positionAttribute = new PositionAttribute(args.positionAttribute);
      modifiedUser = await User.findByIdAndUpdate(
        args.user,
        {
          $push: { positionAttributes: positionAttribute },
        },
        { new: true }
      ).populate({
        path: 'positionAttributes',
        match: { 'category.application': { $eq: category.application } },
      });
      return modifiedUser;
    } else {
      throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
    }
  },
};
