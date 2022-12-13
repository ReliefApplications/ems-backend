import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';

/**
 * Delete existing aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    resource: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    if (!args.resource) {
      throw new GraphQLError(
        context.i18next.t(
          'mutations.aggregation.delete.errors.invalidArguments'
        )
      );
    }
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    // Edition of a resource
    if (args.resource) {
      const filters = Resource.accessibleBy(ability, 'update')
        .where({ _id: args.resource })
        .getFilter();
      const resource: Resource = await Resource.findOne(filters);
      if (!resource) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      const aggregation = resource.aggregations.id(args.id).remove();
      await resource.save();
      return aggregation;
    }
  },
};
