import { GraphQLList, GraphQLBoolean, GraphQLID, GraphQLError } from 'graphql';
import { Role } from '@models';
import { RoleType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { userNotLogged } from '@utils/schema';

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
  resolve(parent, args, context) {
    const user = context.user;
    userNotLogged(user);
    try {
      const ability: AppAbility = context.user.ability;
      if (ability.can('read', 'Role')) {
        if (args.all) {
          return Role.accessibleBy(ability, 'read');
        } else {
          if (args.application) {
            return Role.accessibleBy(ability, 'read').where({
              application: args.application,
            });
          } else {
            return Role.accessibleBy(ability, 'read').where({
              application: null,
            });
          }
        }
      } else {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
