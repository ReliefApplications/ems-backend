import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import { User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { PositionAttributeType } from '../types';

/**
 * Return position attributes from category id.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PositionAttributeType),
  args: {
    category: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    if (ability.cannot('read', 'User')) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    const positionAttributes = [];
    const lastAttributeValue = [];
    const users = await User.find(
      { 'positionAttributes.category': args.category },
      { positionAttributes: true }
    );
    if (users) {
      users.forEach((x) => {
        x.positionAttributes.forEach((attribute) => {
          if (
            !lastAttributeValue.includes(attribute.value) &&
            attribute.category.toString() === args.category
          ) {
            positionAttributes.push({
              value: attribute.value,
              category: attribute.category,
            });
            lastAttributeValue.push(attribute.value);
          }
        });
      });
    }
    return positionAttributes;
  },
};
