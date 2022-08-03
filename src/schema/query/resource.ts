import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';

export default {
  /*  Returns resource from id if available for the logged user.
        Throw GraphQL error if not logged.
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
    const resource = await Resource.accessibleBy(ability, 'read').findOne({
      _id: args.id,
    });
    if (!resource) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return resource;
  },
};
