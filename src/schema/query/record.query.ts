import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { getDraftRecordFilter } from '@utils/filter';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the record query */
type RecordArgs = {
  id: string | Types.ObjectId;
  draft?: boolean;
  allDrafts?: boolean;
};

/**
 * Return record from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    draft: { type: GraphQLBoolean },
    allDrafts: { type: GraphQLBoolean },
  },
  async resolve(parent, args: RecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the form and the record
      const record = await Record.findOne({
        _id: args.id,
        ...getDraftRecordFilter(args, user),
      });
      if (!record) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const form = await Form.findById(record.form);

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
