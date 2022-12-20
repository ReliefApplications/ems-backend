import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Return resource from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const resource = await Resource.findOne({ _id: args.id });

    if (ability.cannot('read', resource)) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
    return resource;
  },
};
