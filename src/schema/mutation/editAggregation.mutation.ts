import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { ReferenceData, Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import {
  AggregationArgs,
  AggregationInputType,
} from '@schema/inputs/aggregation.input';
import { Context } from '@server/apollo/context';

/** Arguments for the editAggregation mutation */
type EditAggregationArgs = {
  id: string | Types.ObjectId;
  aggregation: AggregationArgs;
  resource?: string | Types.ObjectId;
  referenceData?: string | Types.ObjectId;
};

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
    referenceData: { type: GraphQLID },
  },
  async resolve(parent, args: EditAggregationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if ((!args.resource && !args.referenceData) || !args.aggregation) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.aggregation.edit.errors.invalidArguments'
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

        resource.aggregations.id(args.id).sourceFields =
          args.aggregation.sourceFields;
        resource.aggregations.id(args.id).pipeline = args.aggregation.pipeline;
        resource.aggregations.id(args.id).mapping = args.aggregation.mapping;
        resource.aggregations.id(args.id).name = args.aggregation.name;

        await resource.save();
        return resource.aggregations.id(args.id);
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

        referenceData.aggregations.id(args.id).sourceFields =
          args.aggregation.sourceFields;
        referenceData.aggregations.id(args.id).pipeline =
          args.aggregation.pipeline;
        referenceData.aggregations.id(args.id).mapping =
          args.aggregation.mapping;
        referenceData.aggregations.id(args.id).name = args.aggregation.name;

        await referenceData.save();
        return referenceData.aggregations.id(args.id);
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
