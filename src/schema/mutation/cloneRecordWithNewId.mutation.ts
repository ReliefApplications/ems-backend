import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import {
  applyConditionalIds,
  checkRecordValidation,
  getNextId,
  hasInaccessibleFields,
  transformRecord,
} from '@utils/form';
import { Form, Record, Resource } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { RecordType } from '../types';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';

/** Arguments for the cloneRecordWithNewId mutation */
type CloneRecordWithNewIdArgs = {
  id: string | Types.ObjectId;
  data: any;
};

/**
 * Clone a record into a new one with freshly generated conditionalId field
 * values, and archive the source record. Used when a conditionalId field's
 * sourceField (e.g. cecis_case) needs to change: that field is immutable on
 * an existing record, so changing it must produce a new record + new id
 * instead of mutating the old one in place.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    data: { type: new GraphQLNonNull(GraphQLJSON) },
  },
  async resolve(parent, args: CloneRecordWithNewIdArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get the record and its form
      const oldRecord = await Record.findById(args.id);
      const form = oldRecord && (await Form.findById(oldRecord.form));
      if (!oldRecord || !form) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permissions: must be able to update the old record and create a new
      // one, and only touch fields the user actually has access to (same checks
      // editRecord enforces - this mutation must not be a permission bypass side door).
      const ability = await extendAbilityForRecords(user, form);
      const parentResource: Resource = form.resource
        ? await Resource.findById(form.resource, 'fields')
        : ({ fields: form.fields } as Resource);
      if (
        ability.cannot('update', oldRecord) ||
        ability.cannot('create', 'Record') ||
        hasInaccessibleFields(oldRecord, args.data, ability, parentResource)
      ) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      const validationErrors = checkRecordValidation(
        oldRecord,
        args.data,
        form,
        context
      );
      if (validationErrors.length) {
        return Object.assign(oldRecord, { validationErrors });
      }

      const structureId = String(form.resource ? form.resource : form.id);
      const mergedData = { ...oldRecord.data, ...args.data };
      transformRecord(mergedData, form.fields);
      // Discards the stale conditionalId values inherited from oldRecord.data
      // and regenerates them from the (possibly just-changed) sourceField values.
      await applyConditionalIds(form.fields, mergedData, structureId);

      const newRecord = new Record({
        incrementalId: await getNextId(structureId),
        form: oldRecord.form,
        data: mergedData,
        resource: form.resource ? form.resource : null,
        createdBy: oldRecord.createdBy,
        _createdBy: {
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
          },
        },
        lastUpdateForm: form.id,
        _form: {
          _id: form._id,
          name: form.name,
        },
        _lastUpdateForm: {
          _id: form._id,
          name: form.name,
        },
      });
      await newRecord.save();

      oldRecord.archived = true;
      await oldRecord.save();

      return newRecord;
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
