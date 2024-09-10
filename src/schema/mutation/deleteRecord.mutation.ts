import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { logEvent } from '@utils/events/logEvent';
import { EventType } from '@utils/events/event.model';

/** Arguments for the deleteRecord mutation */
type DeleteRecordArgs = {
  id: string | Types.ObjectId;
  hardDelete?: boolean;
};

/**
 * Delete a record, if user has permission to update associated form / resource.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    hardDelete: { type: GraphQLBoolean },
  },
  async resolve(parent, args: DeleteRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get the record and form objects
      const record = await Record.findById(args.id);
      const form = await Form.findById(record.form);

      // Check the ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('delete', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Delete the record
      if (args.hardDelete) {
        return await Record.findByIdAndDelete(record._id);
      } else {
        logEvent({
          type: EventType.UPDATE_RECORD,
          user: user._id.toString(),
          datetime: new Date(),
          record: record.incrementalId,
          form: form.name,
        });
        return await Record.findByIdAndUpdate(
          record._id,
          { archived: true },
          { new: true }
        );
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
