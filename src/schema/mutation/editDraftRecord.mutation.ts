import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { graphQLAuthCheck } from '@schema/shared';
import { logger } from '@lib/logger';
import { Context } from '@server/apollo/context';
import { DraftRecordType } from '@schema/types';
import { transformRecord } from '@utils/form';
import { DraftRecord, Form } from '@models';
import GraphQLJSON from 'graphql-type-json';
import { Types } from 'mongoose';

/** Arguments for the editRecord mutation */
type EditRecordArgs = {
  id: string | Types.ObjectId;
  data?: any;
};

/**
 * Edit an existing draft record.
 */
export default {
  type: DraftRecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    data: { type: GraphQLJSON },
  },
  async resolve(parent, args: EditRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (!args.data) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.edit.errors.invalidArguments')
        );
      }

      // Get old draft record and form
      const oldDraftRecord: DraftRecord = await DraftRecord.findById(args.id);
      const form: Form = await Form.findById(oldDraftRecord.form);

      if (!oldDraftRecord || !form) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      transformRecord(args.data, form.fields);
      const update: any = {
        data: { ...oldDraftRecord.data, ...args.data },
        lastUpdateForm: form,
        _lastUpdateForm: {
          _id: form._id,
          name: form.name,
        },
      };
      const draftRecord = DraftRecord.findByIdAndUpdate(args.id, update, {
        new: true,
      });
      return await draftRecord;
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
