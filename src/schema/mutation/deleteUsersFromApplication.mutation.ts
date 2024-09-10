import { GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull } from 'graphql';
import permissions from '@const/permissions';
import { PositionAttributeCategory, Role, User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { UserType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteUsersFromApplication mutation */
type DeleteUsersFromApplicationArgs = {
  ids: string[] | Types.ObjectId[];
  application: string | Types.ObjectId;
};

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
  async resolve(
    parent,
    args: DeleteUsersFromApplicationArgs,
    context: Context
  ) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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
      return await User.find({ _id: { $in: args.ids } });
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
