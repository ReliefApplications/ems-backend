import { GraphQLError, GraphQLNonNull, GraphQLString } from 'graphql';
import { PositionAttribute, PositionAttributeCategory, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeArgs, PositionAttributeInputType } from '../inputs';
import { UserType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';

/** Arguments for the addPositionAttribute mutation */
type AddPositionAttributeArgs = {
  user: string;
  positionAttribute: PositionAttributeArgs;
};

/**
 * Add new position attribute.
 */
export default {
  type: UserType,
  args: {
    user: { type: new GraphQLNonNull(GraphQLString) },
    positionAttribute: { type: new GraphQLNonNull(PositionAttributeInputType) },
  },
  async resolve(parent, args: AddPositionAttributeArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      const category = await PositionAttributeCategory.findById(
        args.positionAttribute.category
      ).populate({ path: 'application', model: 'Application' });
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
          model: 'PositionAttribute',
        });
        return modifiedUser;
      } else {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
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
