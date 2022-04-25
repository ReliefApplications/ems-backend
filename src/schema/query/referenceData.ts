import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ReferenceDataType } from '../types';
import { ReferenceData } from '../../models';

/**
 * Return Reference Data from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ReferenceDataType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability = context.user.ability;
    if (ability.can('read', 'ReferenceData')) {
      return ReferenceData.findById(args.id);
    } else {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
  },
};
