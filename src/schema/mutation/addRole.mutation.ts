import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLID,
  GraphQLError,
} from 'graphql';
import { Role, Application, Channel } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { RoleType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addRole mutation */
type AddRoleArgs = {
  title: string;
  application?: string | Types.ObjectId;
};

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
  async resolve(parent, args: AddRoleArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
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

        role.application = args.application;
        if (ability.can('create', role)) {
          await channel.save();
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

        if (ability.can('create', role)) {
          await channel.save();
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
