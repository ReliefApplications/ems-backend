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
  // checkRecordValidation,
} from '@utils/form';
import { RecordType } from '../types';
import { inaccessibleFields } from './editRecord.mutation';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Interface for records with an error */
interface RecordWithError extends Record {
  validationErrors?: {
    question: string;
    errors: string[];
  }[];
}

/** Arguments for the editRecords mutation */
type EditRecordsArgs = {
  ids: string[] | Types.ObjectId[];
  data: any;
  template?: string | Types.ObjectId;
  lang?: string;
};

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
  async resolve(parent, args: EditRecordsArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      if (!args.data) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.edit.errors.invalidArguments')
        );
      }
      const user = context.user;

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
          inaccessibleFields(record, args.data, ability).length === 0
        ) {
          // const validationErrors = checkRecordValidation(
          //   record,
          //   args.data,
          //   record.form,
          //   context,
          //   args.lang
          // );
          // if (validationErrors.length) {
          //   records.push(
          //     Object.assign(record, { validationErrors: validationErrors })
          //   );
          // } else {
          const data = { ...args.data };
          let fields = record.form.fields;

          const template = await Form.findById(
            args.template,
            'fields resource _id name'
          );

          if (args.template && record.form.resource) {
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
            lastUpdateForm: args.template,
            _lastUpdateForm: {
              _id: template._id,
              name: template.name,
            },
            _lastUpdatedBy: {
              user: {
                _id: user._id,
                name: user.name,
                username: user.username,
              },
            },
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
          // }
        }
      }
      return records;
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
