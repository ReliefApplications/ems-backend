import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLList,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Record, Version, Form, Resource } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
  hasInaccessibleFields,
  validateUniqueness,
  validateBatchUniqueness,
  UniquenessError,
  logUniquenessError,
} from '@utils/form';
import { RecordType } from '../types';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { getErrorMessage, getErrorStack } from '@utils/error';
import { groupBy } from 'lodash';

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
  skipValidation: boolean;
};

/** Edition of a record, prepared before being checked and applied */
type RecordEdition = {
  record: RecordWithError;
  resource: Resource | null;
  template: Form;
  /** Data of the record, once updated */
  data: any;
  validationErrors: RecordWithError['validationErrors'];
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
    skipValidation: { type: GraphQLBoolean, defaultValue: true },
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

      // Prepare the edition of each record the user can update
      const editions: RecordEdition[] = [];
      for (const record of oldRecords) {
        const ability = await extendAbilityForRecords(user, record.form);
        const parentResource: Resource = await Resource.findById(
          record.form.resource,
          'fields uniquenessRules'
        );
        if (
          ability.can('update', record) &&
          !hasInaccessibleFields(record, args.data, ability, parentResource)
        ) {
          const validationErrors = checkRecordValidation(
            record,
            args.data,
            record.form,
            context,
            args.lang
          );
          if (validationErrors.length && !args.skipValidation) {
            editions.push({
              record,
              resource: parentResource,
              template: record.form,
              data: record.data,
              validationErrors,
            });
          } else {
            const data = { ...args.data };
            let fields = record.form.fields;

            const template = args.template
              ? await Form.findById(args.template, 'fields resource _id name')
              : record.form;

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
            editions.push({
              record,
              resource: parentResource,
              template,
              data: { ...record.data, ...data },
              validationErrors: [],
            });
          }
        }
      }

      // Check uniqueness rules configured on the resources, if any, before
      // updating anything: both against the other records of the resource, and
      // between the edited records themselves
      const t = context.i18next.t.bind(context.i18next);
      const toCheck = editions.filter(
        (x) => !x.validationErrors.length && !x.record.draft
      );
      const uniquenessErrors: string[] = [];
      for (const resourceEditions of Object.values(
        groupBy(toCheck, (x) => String(x.resource?._id))
      )) {
        const resource = resourceEditions[0].resource;
        if (!resource?.uniquenessRules?.length) {
          continue;
        }
        const batchResults = validateBatchUniqueness(
          resourceEditions.map((x) => x.data),
          resource,
          t
        );
        const editedIds = resourceEditions.map((x) => x.record._id);
        for (const [index, edition] of resourceEditions.entries()) {
          const result = await validateUniqueness(
            edition.data,
            resource,
            editedIds,
            t
          );
          const errors = [...batchResults[index].errors, ...result.errors];
          if (errors.length) {
            uniquenessErrors.push(
              `${edition.record.incrementalId}: ${errors
                .map((e) => e.errors.join(' '))
                .join(' ')}`
            );
          }
          if (!args.skipValidation) {
            edition.validationErrors = [
              ...batchResults[index].warnings,
              ...result.warnings,
            ];
          }
        }
      }
      if (uniquenessErrors.length) {
        throw new UniquenessError(uniquenessErrors.join('\n'));
      }

      // Apply the editions
      for (const edition of editions) {
        const { record, template } = edition;
        if (edition.validationErrors.length) {
          records.push(
            Object.assign(record, {
              validationErrors: edition.validationErrors,
            })
          );
          continue;
        }
        const version = new Version({
          createdAt: record.modifiedAt ? record.modifiedAt : record.createdAt,
          data: record.data,
          createdBy: user._id,
        });
        const update: any = {
          data: edition.data,
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
      }
      return records;
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
