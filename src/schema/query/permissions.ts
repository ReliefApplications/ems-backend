import { GraphQLList, GraphQLBoolean, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { Permission } from '../../models';
import { PermissionType } from '../types';

export default {
  /*  List permissions.
        Throw GraphQL error if not logged.
    */
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
      throw new GraphQLError(errors.userNotLogged);
    }
  },
};
