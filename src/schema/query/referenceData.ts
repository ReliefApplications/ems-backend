import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import errors from '../../const/errors';
import { ReferenceDataType } from '../types';
import { ReferenceData } from '../../models';

export default {
  /*  Returns Reference Data from id if available for the logged user.
      Throw GraphQL error if not logged.
    */
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }

    const ability = context.user.ability;
    if (ability.can('read', 'ReferenceData')) {
      return ReferenceData.findById(args.id);
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
