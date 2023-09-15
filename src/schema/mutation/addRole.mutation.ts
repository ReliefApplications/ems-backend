import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { Role, Application, Channel } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';
import { logger } from '@services/logger.service';

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
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
      const ability: AppAbility = user.ability;
      if (args.application) {
        const application = await Application.findById(args.application);
        if (!application)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        const role = new Role({
          title: args.title,
        });

        const channel = new Channel({
          title: `Role - ${role.title}`,
          role: role._id,
        });

        if (!application)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );

        if (ability.can('create', channel)) {
          await channel.save();
        }

        role.application = args.application;
        if (ability.can('create', role)) {
          return await role.save();
        }
      } else {
        const role = new Role({
          title: args.title,
        });

        const channel = new Channel({
          title: `Role - ${role.title}`,
          role: role._id,
        });

        if (ability.can('create', channel)) {
          await channel.save();
        }

        if (ability.can('create', role)) {
          return await role.save();
        }
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
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
