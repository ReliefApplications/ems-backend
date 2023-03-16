import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import { Permission } from '@models';
import { PermissionType } from '../types';

/**
 * List permissions.
 * Throw GraphQL error if not logged.
 */
export default {
  type: new GraphQLList(PermissionType),
  args: {
    application: { type: GraphQLBoolean },
  },
  resolve(parent, args, context) {
    const user = context.user;
    if (user) {
      if (args.application) {
        return Permission.find({ global: false });
      }
      return Permission.find({ global: true });
    } else {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
  },
};
