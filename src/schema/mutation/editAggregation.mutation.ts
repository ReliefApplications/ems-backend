import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '../../models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '../../security/defineUserAbility';
import AggregationInputType from '../../schema/inputs/aggregation.input';

/**
 * Add new aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    aggregation: { type: new GraphQLNonNull(AggregationInputType) },
    resource: { type: GraphQLID },
    aggregation_id: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    if (!args.resource || !args.aggregation || !args.aggregation_id) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditAggregationArguments')
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

      resource.aggregations.id(args.aggregation_id).sourceFields =
        args.aggregation.sourceFields;
      resource.aggregations.id(args.aggregation_id).pipeline =
        args.aggregation.pipeline;
      resource.aggregations.id(args.aggregation_id).mapping =
        args.aggregation.mapping;

      console.log('resource.aggregations ==>> ', resource.aggregations);

      await resource.save();
      return resource.aggregations.id(args.aggregation_id);
    }
  },
};
