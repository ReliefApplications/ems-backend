import { GraphQLError, GraphQLID } from 'graphql';
import { Resource } from '../../models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '../../security/defineUserAbility';

/**
 * Add new aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    resource: { type: GraphQLID },
    aggregation_id: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    if (!args.resource || !args.aggregation_id) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidDeleteAggregationArguments')
      );
    }
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
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
          context.i18next.t('errors.permissionNotGranted')
        );
      }

      const aggregation = resource.aggregations
        .id(args.aggregation_id)
        .remove();
      await resource.save();
      return aggregation;
    }
  },
};
