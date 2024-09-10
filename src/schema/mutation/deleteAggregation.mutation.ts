import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { ReferenceData, Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the deleteAggregation mutation */
type DeleteAggregationArgs = {
  id: string | Types.ObjectId;
  resource?: string | Types.ObjectId;
  referenceData?: string | Types.ObjectId;
};

/**
 * Delete existing aggregation.
 * Throw an error if user not connected.
 */
export default {
  type: AggregationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    resource: { type: GraphQLID },
    referenceData: { type: GraphQLID },
  },
  async resolve(parent, args: DeleteAggregationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (!args.resource && !args.referenceData) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.aggregation.delete.errors.invalidArguments'
          )
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

        const aggregation = resource.aggregations.id(args.id).deleteOne();
        await resource.save();
        return aggregation;
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

        const aggregation = referenceData.aggregations.id(args.id).deleteOne();
        await referenceData.save();
        return aggregation;
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
