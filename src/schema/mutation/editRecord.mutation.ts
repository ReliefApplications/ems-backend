import {
  GraphQLID,
  GraphQLError,
  GraphQLString,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record, Resource, Version } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  // checkRecordValidation,
  checkRecordTriggers,
} from '@utils/form';
import { RecordType } from '../types';
import { Types } from 'mongoose';
import { AppAbility } from 'security/defineUserAbility';
import { filter, isEqual, keys, union, has, get } from 'lodash';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Context } from '@server/apollo/context';
import { logEvent } from '@utils/events/logEvent';
import { EventType } from '@utils/events/event.model';

/**
 * Checks if the user has the permission to update all the fields they're trying to update
 *
 * @param record The record to edit
 * @param newData The new data to set
 * @param ability The user ability
 * @returns If there's a field the user can't update
 */
export const inaccessibleFields = (
  record: Record,
  newData: any,
  ability: AppAbility
) => {
  const oldData = record.data || {};
  const allKeys = union(keys(oldData), keys(newData));
  const updatedKeys = filter(allKeys, (key) => {
    let previous = get(oldData, key);
    let next = get(newData, key);

    // check for date objects and convert them to strings
    if (previous instanceof Date) previous = previous.toISOString();
    if (next instanceof Date) next = next.toISOString();

    return !isEqual(previous, next);
  });

  const failedKeys = updatedKeys.filter(
    (question) =>
      ability.cannot('update', record, `data.${question}`) &&
      has(newData, question)
  );

  return failedKeys;
};

/** Arguments for the editRecord mutation */
type EditRecordArgs = {
  id?: string | Types.ObjectId;
  uniqueField?: string;
  uniqueValue?: string;
  data?: any;
  version?: string | Types.ObjectId;
  template?: string | Types.ObjectId;
  lang?: string;
  draft?: boolean;
};

/**
 * Edit an existing record.
 * Create also an new version to store previous configuration.
 */
export default {
  type: RecordType,
  args: {
    id: { type: GraphQLID },
    uniqueField: { type: GraphQLString },
    uniqueValue: { type: GraphQLString },
    data: { type: GraphQLJSON },
    version: { type: GraphQLID },
    template: { type: GraphQLID },
    lang: { type: GraphQLString },
    draft: { type: GraphQLBoolean },
  },
  async resolve(parent, args: EditRecordArgs, context: Context) {
    // Authentication check
    graphQLAuthCheck(context);
    try {
      //
      if (!args.data && !args.version) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.edit.errors.invalidArguments')
        );
      }

      if (!(args.uniqueField && args.uniqueValue) && !args.id) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.errors.missingParameters')
        );
      }

      const user = context.user;
      // Get record
      let oldRecord: Record;
      if (args.id) {
        oldRecord = await Record.findById(args.id);
      } else if (args.uniqueField && args.uniqueValue) {
        const query = {};
        query[`data.${args.uniqueField}`] = args.uniqueValue;
        oldRecord = await Record.findOne(query);
      }
      if (!oldRecord) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      const oldRecordId = oldRecord.id;
      // Get form
      const parentForm: Form = await Form.findById(
        oldRecord.form,
        'fields permissions resource structure'
      );
      if (!oldRecord || !parentForm) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permissions with two layers
      const ability = await extendAbilityForRecords(user, parentForm);
      const errorFields = inaccessibleFields(oldRecord, args.data, ability);
      if (ability.cannot('update', oldRecord) || errorFields.length > 0) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted') +
            errorFields.join(', ')
        );
      }

      // If draft option, return record after running triggers
      if (args.draft) {
        const triggeredRecord = checkRecordTriggers(
          oldRecord,
          args.data,
          parentForm,
          context
        );
        return triggeredRecord;
      }

      // Update record
      // Put a try catch for record validation + check the structure of this form
      // let validationErrors;
      // try {
      //   validationErrors = checkRecordValidation(
      //     oldRecord,
      //     args.data,
      //     parentForm,
      //     context,
      //     args.lang
      //   );
      // } catch (err) {
      //   logger.error(err.message, { stack: err.stack });
      // }
      // if (validationErrors && validationErrors.length) {
      //   return Object.assign(oldRecord, { validationErrors });
      // }

      // Generate new version, from current data
      const version = new Version({
        createdAt: oldRecord.modifiedAt
          ? oldRecord.modifiedAt
          : oldRecord.createdAt,
        data: oldRecord.data,
        createdBy: user._id,
      });
      let template: Form | Resource;
      let fields: any[] = [];
      if (args.template && parentForm.resource) {
        template = await Form.findById(args.template, 'name fields resource');
        fields = template.fields;
        if (!(template as Form).resource.equals(parentForm.resource)) {
          throw new GraphQLError(
            context.i18next.t(
              'mutations.record.edit.errors.wrongTemplateProvided'
            )
          );
        }
      } else {
        if (parentForm.resource) {
          template = await Form.findOne({
            resource: parentForm.resource,
            core: true,
          });
          fields = (await Resource.findById(parentForm.resource, 'fields'))
            .fields;
        } else {
          template = parentForm;
          fields = parentForm.fields;
        }
      }
      // Template doesn't exist
      if (!template) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }
      // Classic edition
      if (!args.version) {
        transformRecord(args.data, fields);
        const update: any = {
          data: { ...oldRecord.data, ...args.data },
          lastUpdateForm: args.template,
          $push: { versions: version._id },
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
        };
        const ownership = getOwnership(fields, args.data); // Update with template during merge
        Object.assign(
          update,
          ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
        );
        const record = Record.findByIdAndUpdate(oldRecordId, update, {
          new: true,
        });
        await version.save();
        logEvent({
          type: EventType.UPDATE_RECORD,
          user: user._id.toString(),
          datetime: new Date(),
          record: oldRecord.incrementalId,
          form: template.name,
        });
        return await record;
      } else {
        // Revert an old version
        const oldVersion = await Version.findOne({
          $and: [
            {
              _id: {
                $in: oldRecord.versions.map((x) => new Types.ObjectId(x)),
              },
            },
            { _id: args.version },
          ],
        });
        const update: any = {
          data: oldVersion.data,
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
        const record = Record.findByIdAndUpdate(oldRecordId, update, {
          new: true,
        });
        await version.save();
        return await record;
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
