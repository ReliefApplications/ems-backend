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
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

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
      const targetRecord = new Record({
        incrementalId: await getNextId(
          String(oldForm.resource ? oldForm.resource : args.form)
        ),
        form: args.form,
        //createdAt: new Date(),
        //modifiedAt: new Date(),
        data,
        resource: oldForm.resource,
        versions: oldVersions,
      });
      return targetRecord.save();
    } else {
      const update: any = {
        form: args.form,
        //modifiedAt: new Date(),
      };
      return Record.findByIdAndUpdate(args.id, update, { new: true });
    }
  },
};
