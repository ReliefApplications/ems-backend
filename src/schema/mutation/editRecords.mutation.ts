import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Record, Version, Form } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
} from '@utils/form';
import { RecordType } from '../types';
import { hasInaccessibleFields } from './editRecord.mutation';

/** Interface for records with an error */
interface RecordWithError extends Record {
  validationErrors?: {
    question: string;
    errors: string[];
  }[];
}

/**
 * Edit existing records.
 * Create also a new version to store previous configuration.
 */
export default {
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
        context.i18next.t('mutations.record.edit.errors.invalidArguments')
      );
    }
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
      const ability = await extendAbilityForRecords(user, record.form);
      if (
        ability.can('update', record) &&
        !hasInaccessibleFields(record, args.data, ability)
      ) {
        const validationErrors = checkRecordValidation(
          record,
          args.data,
          record.form,
          context,
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
                context.i18next.t(
                  'mutations.record.edit.errors.wrongTemplateProvided'
                )
              );
            }
            fields = template.fields;
          }
          transformRecord(data, fields);
          const version = new Version({
            createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
            data: record.data,
            createdBy: user._id,
          });
          const update: any = {
            data: { ...record.data, ...data },
            //modifiedAt: new Date(),
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
