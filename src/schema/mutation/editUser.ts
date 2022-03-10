import { GraphQLNonNull, GraphQLID, GraphQLList, GraphQLError } from 'graphql';
import permissions from '../../const/permissions';
import { User } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { UserType } from '../types';
import { PositionAttributeInputType } from '../inputs';

export default {
  /*  Edits an user's roles, providing its id and the list of roles.
        Throws an error if not logged or authorized.
    */
  type: UserType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    roles: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    application: { type: GraphQLID },
    positionAttributes: { type: new GraphQLList(PositionAttributeInputType) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

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
            context.i18next.t('errors.permissionNotGranted')
          );
        }
      }
      const nonAppRoles = await User.findById(args.id).populate({
        path: 'roles',
        match: { application: { $ne: args.application } }, // Only returns roles not attached to the application
      });
      roles = nonAppRoles.roles.map((x) => x._id).concat(roles);
      const positionAttributes = args.positionAttributes.filter(
        (element) => element.value.length > 0
      );
      return User.findByIdAndUpdate(
        args.id,
        {
          roles,
          positionAttributes,
        },
        { new: true }
      ).populate({
        path: 'roles',
        match: { application: args.application }, // Only returns roles attached to the application
      });
    } else {
      if (ability.cannot('update', 'User')) {
        throw new GraphQLError(
          context.i18next.t('errors.permissionNotGranted')
        );
      }
      const appRoles = await User.findById(args.id).populate({
        path: 'roles',
        match: { application: { $ne: null } }, // Returns roles attached to any application
      });
      roles = appRoles.roles.map((x) => x._id).concat(roles);
      return User.findByIdAndUpdate(
        args.id,
        {
          roles,
        },
        { new: true }
      );
    }
  },
};
