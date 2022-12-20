import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import permissions from '@const/permissions';
import { PositionAttributeCategory, Role, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { UserType } from '../types';

/**
 * Delete a user from application.
 * Throw an error if not logged or authorized.
 */
export default {
  type: new GraphQLList(UserType),
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    application: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    // Test global permissions and application permission
    if (ability.cannot('delete', 'User')) {
      const canDelete = user.roles.some(
        (x) =>
          x.application &&
          x.application.equals(args.application) &&
          x.permissions.some(
            (y) => y.type === permissions.canSeeUsers && !y.global
          )
      );
      if (!canDelete) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    }
    const roles = await Role.find({ application: args.application });
    const positionAttributeCategories = await PositionAttributeCategory.find({
      application: args.application,
    });
    await User.updateMany(
      {
        _id: {
          $in: args.ids,
        },
      },
      {
        $pull: {
          roles: { $in: roles.map((x) => x.id) },
          positionAttributes: {
            category: { $in: positionAttributeCategories.map((x) => x.id) },
          },
        },
      }
    );
    return User.find({ _id: { $in: args.ids } });
  },
};
