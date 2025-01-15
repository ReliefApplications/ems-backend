import { GraphQLID, GraphQLError, GraphQLString } from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the record query */
type RecordArgs = {
  id?: string | Types.ObjectId;
  uniqueField?: string;
  uniqueValue?: string;
};

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: RecordType,
  args: {
    id: { type: GraphQLID },
    uniqueField: { type: GraphQLString },
    uniqueValue: { type: GraphQLString },
  },
  async resolve(parent, args: RecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the form and the record
      if (!(args.uniqueField && args.uniqueValue) && !args.id) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.errors.missingParameters')
        );
      }

      let record: Record;
      if (args.id) {
        record = await Record.findById(args.id);
      } else if (args.uniqueField && args.uniqueValue) {
        const query = {};
        query[`data.${args.uniqueField}`] = args.uniqueValue;
        record = await Record.findOne(query);
      }

      if (!record) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      const form = await Form.findById(record.form, 'resource');

      // Check ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('read', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Return the record
      return getAccessibleFields(record, ability);
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
