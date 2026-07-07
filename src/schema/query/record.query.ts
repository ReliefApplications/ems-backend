import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Form, Record, Resource } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { CalculatedFieldService } from '@services/calculatedField.service';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the record query */
type RecordArgs = {
  id: string | Types.ObjectId;
};

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: RecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the form and the record
      const record = await Record.findById(args.id);
      const form = await Form.findById(record.form);

      // Check ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('read', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Resolve calculated fields, so that they're not left undefined in the returned data
      if (record.resource) {
        const resource = await Resource.findById(record.resource);
        const calculatedFields = (resource?.fields || []).filter(
          (f: any) => f.isCalculated
        );
        if (calculatedFields.length > 0) {
          const calculatedFieldService = new CalculatedFieldService(
            resource,
            context,
            context.timeZone,
            context.user?.attributes || {}
          );
          const pipeline: any[] = [{ $match: { _id: record._id } }];
          for (const field of calculatedFields) {
            pipeline.push(
              ...(await calculatedFieldService.build(
                field.expression,
                field.name
              ))
            );
          }
          const result = await Record.aggregate(pipeline);
          if (result[0]?.data) {
            record.data = { ...record.data, ...result[0].data };
          }
        }
      }

      // Return the record
      return getAccessibleFields(record, ability);
    } catch (err) {
      logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
