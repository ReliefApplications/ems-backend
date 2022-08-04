import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { buildTypes } from '../../utils/schema';
import { AppAbility } from '../../security/defineUserAbility';

export default {
  /*  Deletes a resource from its id.
        Throws GraphQL error if not logged or authorized.
    */
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const deletedResource = await Resource.accessibleBy(
      ability,
      'delete'
    ).findOneAndDelete({ _id: args.id });

    if (!deletedResource) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    buildTypes();
    return deletedResource;
  },
};
