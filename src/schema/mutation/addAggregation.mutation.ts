import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { ReferenceData, Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import {
  AggregationArgs,
  AggregationInputType,
} from '../../schema/inputs/aggregation.input';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addDashboard mutation */
type AddAggregationArgs = {
  aggregation: AggregationArgs;
  resource?: string | Types.ObjectId;
  referenceData?: string | Types.ObjectId;
};

/**
 * Add new aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    aggregation: { type: new GraphQLNonNull(AggregationInputType) },
    resource: { type: GraphQLID },
    referenceData: { type: GraphQLID },
  },
  async resolve(parent, args: AddAggregationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if ((!args.resource && !args.referenceData) || !args.aggregation) {
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
      // Edition of a reference data
      if (args.referenceData) {
        const filters = ReferenceData.find(
          accessibleBy(ability, 'update').ReferenceData
        )
          .where({ _id: args.referenceData })
          .getFilter();

        const referenceData: ReferenceData = await ReferenceData.findOne(
          filters
        );
        if (!referenceData) {
          throw new GraphQLError(
            context.i18next.t('common.errors.permissionNotGranted')
          );
        }
        referenceData.aggregations.push(args.aggregation);
        await referenceData.save();
        return referenceData.aggregations.pop();
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
