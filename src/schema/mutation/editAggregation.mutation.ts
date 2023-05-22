import { GraphQLError, GraphQLID, GraphQLNonNull } from 'graphql';
import { Dashboard, Resource } from '@models';
import { AggregationType } from '../../schema/types';
import { AppAbility } from '@security/defineUserAbility';
import AggregationInputType from '../../schema/inputs/aggregation.input';
// import { logger } from '@services/logger.service';

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
    // try {
    if (!args.resource || !args.aggregation) {
      throw new GraphQLError(
        context.i18next.t('mutations.aggregation.edit.errors.invalidArguments')
      );
    }

    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }
    const ability: AppAbility = user.ability;
    // Edition of a resource
    if (args.resource) {
      //get resource aggregation data
      const resourceData = await Resource.findOne({
        aggregations: {
          $elemMatch: { _id: args.id },
        },
      });

      if (!args.forceFullyUpdateFields) {
        args.forceFullyUpdateFields = false;
      }
      //check aggregation data available or not and check forcefully update this aggregation fields..
      if (
        !!resourceData &&
        !!resourceData.aggregations &&
        args.forceFullyUpdateFields == false
      ) {
        //get widget data
        const widgetData = await Dashboard.find({
          $and: [
            {
              structure: {
                $elemMatch: {
                  'settings.resource': resourceData._id.toString(),
                },
              },
            },
            {
              structure: {
                $elemMatch: { 'settings.aggregations': args.id.toString() },
              },
            },
          ],
        });

        //check widget data available or not.
        if (!!widgetData) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.aggregation.edit.errors.alreadyUseAggregationField',
              {
                name: 'widget',
              }
            )
          );
        }
      }
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
    // } catch (err) {
    //   logger.error(err.message, { stack: err.stack });
    //   throw new GraphQLError(
    //     context.i18next.t('common.errors.internalServerError')
    //   );
    // }
  },
};
