import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Record, Version, Form } from '../../models';
import { AppAbility } from '../../security/defineUserAbilities';
import defineUserAbilitiesOnForm from '../../security/defineUserAbilitiesOnForm';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
} from '../../utils/form';
import { RecordType } from '../types';
import { getFormPermissionFilter } from '../../utils/filter';

/** Interface for records with an error */
interface RecordWithError extends Record {
  validationErrors?: {
    question: string;
    errors: string[];
  }[];
}

export default {
  /*  Edits existing records.
        Create also a new version to store previous configuration.
    */
  type: new GraphQLList(RecordType),
  args: {
    ids: { type: new GraphQLNonNull(new GraphQLList(GraphQLID)) },
    data: { type: new GraphQLNonNull(GraphQLJSON) },
    template: { type: GraphQLID },
    lang: { type: GraphQLString },
  },
  async resolve(parent, args, context) {
    if (!args.data) {
      throw new GraphQLError(
        context.i18next.t('errors.invalidEditRecordArguments')
      );
    }
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // Get records and forms
    const records: RecordWithError[] = [];
    const oldRecords: Record[] = await Record.find({
      _id: { $in: args.ids },
    }).populate({
      path: 'form',
      model: 'Form',
    });
    for (const record of oldRecords) {
      const ability: AppAbility = defineUserAbilitiesOnForm(user, record.form);
      let canUpdate = ability.can('update', record);
      if (!canUpdate) {
        const permissionFilters = getFormPermissionFilter(
          user,
          record.form,
          'canUpdateRecords'
        );
        canUpdate =
          permissionFilters.length > 0
            ? await Record.exists({
                $and: [{ _id: record.id }, { $or: permissionFilters }],
              })
            : !record.form.permissions.canUpdateRecords.length;
      }
      if (canUpdate) {
        const validationErrors = checkRecordValidation(
          record,
          args.data,
          record.form,
          args.lang
        );
        if (validationErrors.length) {
          records.push(
            Object.assign(record, { validationErrors: validationErrors })
          );
        } else {
          const data = { ...args.data };
          let fields = record.form.fields;
          if (args.template && record.form.resource) {
            const template = await Form.findById(
              args.template,
              'fields resource'
            );
            if (!template.resource.equals(record.form.resource)) {
              throw new GraphQLError(
                context.i18next.t('errors.wrongTemplateProvided')
              );
            }
            fields = template.fields;
          }
          await transformRecord(data, fields);
          const version = new Version({
            createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
            data: record.data,
            createdBy: user.id,
          });
          const update: any = {
            data: { ...record.data, ...data },
            modifiedAt: new Date(),
            $push: { versions: version._id },
          };
          const ownership = getOwnership(record.form.fields, args.data); // Update with template during merge
          Object.assign(
            update,
            ownership && { createdBy: { ...record.createdBy, ...ownership } }
          );
          const newRecord = await Record.findByIdAndUpdate(record.id, update, {
            new: true,
          });
          await version.save();
          records.push(newRecord);
        }
      }
    }
    return records;
  },
};
