import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import AggregationInputType from '../../schema/inputs/aggregation.input';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';

/**
 * Add new aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    aggregation: { type: new GraphQLNonNull(AggregationInputType) },
    resource: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    graphQLAuthCheck(context);
    try {
      if (!args.resource || !args.aggregation) {
        throw new GraphQLError(
          context.i18next.t('mutations.aggregation.add.errors.invalidArguments')
        );
      }
      const user = context.user;
      const ability: AppAbility = user.ability;
      // Edition of a resource
      if (args.resource) {
        const filters = Resource.find(accessibleBy(ability, 'update').Resource)
          .where({ _id: args.resource })
          .getFilter();
        const resource: Resource = await Resource.findOne(filters);
        if (!resource) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        resource.aggregations.push(args.aggregation);
        await resource.save();
        return resource.aggregations.pop();
      }
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
