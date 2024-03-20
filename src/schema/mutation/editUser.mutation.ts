import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import permissions from '@const/permissions';
import { User } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { UserType } from '../types';
import { PositionAttributeInputType, PositionAttributeArgs } from '../inputs';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editUser mutation */
type EditUserArgs = {
  id: string | Types.ObjectId;
  roles: string[] | Types.ObjectId[];
  groups: string[] | Types.ObjectId[];
  application?: string | Types.ObjectId;
  positionAttributes?: PositionAttributeArgs[];
};
/**
 * Edits an user's roles and groups, providing its id and the list of roles/groups.
 * Throws an error if not logged or authorized.
 */
export default {
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    roles: { type: new GraphQLList(GraphQLID) },
    groups: { type: new GraphQLList(GraphQLID) },
    application: { type: GraphQLID },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  },
  async resolve(parent, args: EditUserArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = context.user.ability;
      let roles = args.roles;
      if (args.application) {
        if (ability.cannot('update', 'User')) {
          // Check applications permissions if we don't have the global one
          const canUpdate = user.roles.some(
            (x) =>
              x.application &&
              x.application.equals(args.application) &&
              x.permissions.some(
                (y) => y.type === permissions.canSeeUsers && !y.global
              )
          );
          if (!canUpdate) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
        }
        const nonAppRoles = await User.findById(args.id).populate({
          path: 'roles',
          model: 'Role',
          match: { application: { $ne: args.application } }, // Only returns roles not attached to the application
        });
        roles = nonAppRoles.roles.map((x) => x._id).concat(roles);
        const update = {
          roles,
        };
        if (args.positionAttributes) {
          const positionAttributes = args.positionAttributes.filter(
            (element) => element.value.length > 0
          );
          Object.assign(update, {
            positionAttributes,
          });
        }
        if (Object.keys(update).length < 1) {
          throw new GraphQLError(
            context.i18next.t('mutations.user.edit.errors.invalidArguments')
          );
        }
        return await User.findByIdAndUpdate(args.id, update, {
          new: true,
        });
      } else {
        if (ability.cannot('update', 'User')) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        const update = {};
        if (args.roles) {
          const appRoles = await User.findById(args.id).populate({
            path: 'roles',
            model: 'Role',
            match: { application: { $ne: null } }, // Returns roles attached to any application
          });
          roles = appRoles.roles.map((x) => x._id).concat(roles);
          Object.assign(update, { roles: roles });
        }
        if (args.groups) {
          Object.assign(update, { groups: args.groups });
        }
        if (Object.keys(update).length < 1) {
          throw new GraphQLError(
            context.i18next.t('mutations.user.edit.errors.invalidArguments')
          );
        }
        return await User.findByIdAndUpdate(args.id, update, { new: true });
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
