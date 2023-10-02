import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { Types } from 'mongoose';

/** Arguments for the deleteAggregation mutation */
type DeleteAggregationArgs = {
  id: string | Types.ObjectId;
  resource?: string | Types.ObjectId;
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
  },
  async resolve(parent, args: DeleteAggregationArgs, context) {
    try {
      if (!args.resource) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.aggregation.delete.errors.invalidArguments'
          )
        );
      }
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }
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
