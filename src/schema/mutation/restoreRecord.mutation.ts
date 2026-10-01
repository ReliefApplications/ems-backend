import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { Record, Resource } from '@models';
import { RecordType } from '../types';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';
import {
  validateUniqueness,
  UniquenessError,
  logUniquenessError,
} from '@utils/form';

/** Arguments for the restoreRecord mutation */
type RestoreRecordArgs = {
  id: string | Types.ObjectId;
};

/**
 * Restore, if user has permission to update associated form / resource.
 * Throw an error if not logged or authorized.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args: RestoreRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // Get the record
      const record = await Record.findById(args.id).populate({
        path: 'form',
        model: 'Form',
      });
      // Check ability
      const ability = await extendAbilityForRecords(user, record.form);
      if (ability.cannot('update', record)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // Check uniqueness rules configured on the resource, if any: another
      // record may have taken the place of the archived one. Warnings cannot
      // be confirmed by the user there, so only errors are blocking
      if (record.resource && !record.draft) {
        const resource = await Resource.findById(
          record.resource,
          'uniquenessRules'
        );
        const uniquenessResult = await validateUniqueness(
          record.data,
          resource,
          record._id,
          context.i18next.t.bind(context.i18next),
          context
        );
        if (uniquenessResult.errors.length) {
          throw new UniquenessError(uniquenessResult.errors);
        }
      }
      // Update the record
      return await Record.findByIdAndUpdate(
        record._id,
        { archived: false },
        { new: true }
      );
    } catch (err) {
      if (err instanceof UniquenessError) {
        logUniquenessError(err);
        throw new GraphQLError(err.message);
      }
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
