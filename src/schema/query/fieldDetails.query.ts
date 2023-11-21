import { GraphQLNonNull, GraphQLError, GraphQLID } from 'graphql';
import { Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { subject } from '@casl/ability';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: GraphQLJSON,
  args: {
    form: { type: new GraphQLNonNull(GraphQLID) },
    field: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(parent, args, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Check ability
      const ability = await extendAbilityForRecords(user);
      const field = args.field;

      let min, max: Record[];
      switch (field.type) {
        case 'numeric':
          max = await Record.find({ form: args.form })
            .sort({ [`data.${field.name}`]: -1 })
            .limit(1);
          min = await Record.find({ form: args.form })
            .sort({ [`data.${field.name}`]: 1 })
            .limit(1);
          if (max.length == 0) {
            //if there is a max, there is a min
            return [];
          }
          if (
            ability.cannot(
              'read',
              subject('Record', max[0]),
              `data.${field.name}`
            )
          ) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
          return [min[0].data[field.name], max[0].data[field.name]];
        case 'time':
        case 'date':
          max = await Record.find({ form: args.form })
            .sort({ [`data.${field.name}`]: -1 })
            .limit(1);

          min = await Record.find({ form: args.form })
            .sort({ [`data.${field.name}`]: 1 })
            .limit(1);

          if (max.length == 0) {
            //if there is a max, there is a min
            return [];
          }
          if (
            ability.cannot(
              'read',
              subject('Record', max[0]),
              `data.${field.name}`
            )
          ) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
          return [
            new Date(min[0].data[field.name]),
            new Date(max[0].data[field.name]),
          ];
        case 'text':
          //We get the 5 most common values from the database
          const mostFrequentValues = await Record.aggregate([
            { $match: { form: new Types.ObjectId(args.form) } },
            {
              $group: {
                _id: `$data.${field.name}`,
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ]);
          if (mostFrequentValues.length == 0) {
            return [];
          }
          if (
            ability.cannot(
              'read',
              subject('Record', mostFrequentValues[0]),
              '_id'
            )
          ) {
            throw new GraphQLError(
              context.i18next.t('common.errors.permissionNotGranted')
            );
          }
          return mostFrequentValues.map((item) => item._id);
        default:
          return new GraphQLError('Unsupported type');
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
