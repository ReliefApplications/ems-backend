import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ApiConfigurationType } from '../types';
import { ApiConfiguration } from '../../models';

export default {
  /*  Returns api configuration from id if available for the logged user.
        Throw GraphQL error if not logged.
    */
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) { throw new GraphQLError(errors.userNotLogged); }

    const ability = context.user.ability;
    if (ability.can('read', 'ApiConfiguration')) {
      return ApiConfiguration.findById(args.id);
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
