import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { buildTypes } from '@utils/schema';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Delete a resource from its id.
 * Throw GraphQL error if not logged or authorized.
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
    const filters = Resource.accessibleBy(ability, 'delete')
      .where({ _id: args.id })
      .getFilter();
    const deletedResource = await Resource.findOneAndDelete(filters);

    /// Resource is not deleted, user does not have permission to do the deletion
    if (!deletedResource) {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }

    buildTypes();
    return deletedResource;
  },
};
