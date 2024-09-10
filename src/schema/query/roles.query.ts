import { GraphQLList, GraphQLBoolean, GraphQLID, GraphQLError } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the roles query */
type RolesArgs = {
  all?: boolean;
  application: string | Types.ObjectId;
};

/**
 * List roles if logged user has admin permission.
 * Throw GraphQL error if not logged or not authorized.
 */
export default {
  type: new GraphQLList(RoleType),
  args: {
    all: { type: GraphQLBoolean },
    application: { type: GraphQLID },
  },
  async resolve(parent, args: RolesArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'Role')) {
        if (args.all) {
          const roles = await Role.find(accessibleBy(ability, 'read').Role);
          return roles;
        } else {
          if (args.application) {
            const roles = await Role.find({
              application: args.application,
              ...accessibleBy(ability, 'read').Role,
            });
            return roles;
          } else {
            const roles = await Role.find({
              application: null,
              ...accessibleBy(ability, 'read').Role,
            });
            return roles;
          }
        }
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
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
