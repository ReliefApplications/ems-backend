import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { getAccessibleFields } from '@utils/form';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

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
