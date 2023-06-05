import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { Form, Record } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { GraphQLHandlingError } from '@utils/schema/errors/interfaceOfErrorHandling.util';

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
  async resolve(parent, args, context) {
    try {
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      // Get the record and form objects
      const record = await Record.findById(args.id);
      const form = await Form.findById(record.form);

      // Check the ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('delete', record)) {
        throw new GraphQLHandlingError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Delete the record
      if (args.hardDelete) {
        return await Record.findByIdAndDelete(record._id);
      } else {
        return await Record.findByIdAndUpdate(
          record._id,
          { archived: true },
          { new: true }
        );
      }
    } catch (err) {
      if (err instanceof GraphQLHandlingError) {
        throw new GraphQLError(err.message);
      }

      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
