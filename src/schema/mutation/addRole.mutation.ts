import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { Role, Application } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';

/**
 * Create a new role.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RoleType,
  args: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    application: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    if (args.application) {
      try {
        const application = await Application.findById(args.application);
        if (!application)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        const role = new Role({
          title: args.title,
        });
        if (!application)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        role.application = args.application;
        if (ability.can('create', role)) {
          return await role.save();
        }
      } catch (err) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
    } else {
      const role = new Role({
        title: args.title,
      });
      if (ability.can('create', role)) {
        return role.save();
      }
    }
    throw new GraphQLError(
      context.i18next.t('common.errors.permissionNotGranted')
    );
  },
};
