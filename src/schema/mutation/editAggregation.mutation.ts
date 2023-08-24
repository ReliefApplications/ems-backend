import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import AggregationInputType from '../../schema/inputs/aggregation.input';
import { logger } from '@services/logger.service';
import { checkUserAuthenticated } from '@utils/schema';

/**
 * Edit existing aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    aggregation: { type: new GraphQLNonNull(AggregationInputType) },
    resource: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    checkUserAuthenticated(user);
    try {
      if (!args.resource || !args.aggregation) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.aggregation.edit.errors.invalidArguments'
          )
        );
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

        resource.aggregations.id(args.id).sourceFields =
          args.aggregation.sourceFields;
        resource.aggregations.id(args.id).pipeline = args.aggregation.pipeline;
        resource.aggregations.id(args.id).mapping = args.aggregation.mapping;
        resource.aggregations.id(args.id).name = args.aggregation.name;

        await resource.save();
        return resource.aggregations.id(args.id);
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
