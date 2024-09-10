import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import { getNextId } from '@utils/form';
import { Form, Record } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import { RecordType } from '../types';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the convertRecord mutation */
type ConvertRecordArgs = {
  id: string | Types.ObjectId;
  form: string | Types.ObjectId;
  copyRecord: boolean;
};

/**
 * Convert a record from one form type to an other form type from the same family (i. e. with same parent resource)
 * It can either be a copy or an overwrite.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    form: { type: new GraphQLNonNull(GraphQLID) },
    copyRecord: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
  async resolve(parent, args: ConvertRecordArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

      // Get the record and forms
      const oldRecord = await Record.findById(args.id);
      const oldForm = await Form.findById(oldRecord.form);
      const targetForm = await Form.findById(args.form);
      if (!oldForm.resource.equals(targetForm.resource))
        throw new GraphQLError(
          context.i18next.t('mutations.record.convert.errors.invalidConversion')
        );

      // Check permissions
      const oldFormAbility = await extendAbilityForRecords(user, oldForm);
      const targetFormAbility = await extendAbilityForRecords(user, targetForm);
      if (
        oldFormAbility.cannot('update', oldRecord) ||
        targetFormAbility.cannot('create', 'Record')
      ) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }

      // Convert the record
      if (args.copyRecord) {
        const data = oldRecord.data;
        const oldVersions = oldRecord.versions;
        const { incrementalId, incID } = await getNextId(
          String(oldForm.resource ? oldForm.resource : args.form)
        );
        const targetRecord = new Record({
          incrementalId,
          incID,
          form: args.form,
          //createdAt: new Date(),
          //modifiedAt: new Date(),
          data,
          resource: oldForm.resource,
          versions: oldVersions,
          lastUpdateForm: targetForm.id,
          _createdBy: {
            user: {
              _id: context.user._id,
              name: context.user.name,
              username: context.user.username,
            },
          },
          _form: {
            _id: targetForm._id,
            name: targetForm.name,
          },
          _lastUpdateForm: {
            _id: targetForm._id,
            name: targetForm.name,
          },
        });
        return await targetRecord.save();
      } else {
        const update: any = {
          form: args.form,
          //modifiedAt: new Date(),
        };
        return await Record.findByIdAndUpdate(args.id, update, { new: true });
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
