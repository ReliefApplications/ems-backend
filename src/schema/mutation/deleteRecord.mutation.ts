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
    try{
      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
      }

      // Get the record and form objects
      const record = await Record.findById(args.id);
      if (!record){
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const form = await Form.findById(record.form);
      if (!form){
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check the ability
      const ability = await extendAbilityForRecords(user, form);
      if (ability.cannot('delete', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Delete the record
      if (args.hardDelete) {
        const recordFound = Record.findByIdAndDelete(record._id);
        if (!recordFound){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return recordFound;
      } else {
        const recordFound = Record.findByIdAndUpdate(
          record._id,
          { archived: true },
          { new: true }
        );
        if (!recordFound){
          throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
        }
        return recordFound;
      } 
    }catch (err){
      logger.error(err.message, { stack: err.stack });
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
