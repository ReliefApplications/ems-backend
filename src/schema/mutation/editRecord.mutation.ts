import {
  GraphQLNonNull,
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
  checkRecordValidation,
  checkRecordTriggers,
} from '@utils/form';
import { RecordType } from '../types';
import { Types } from 'mongoose';
import { AppAbility } from 'security/defineUserAbility';
import { filter, isEqual, keys, union, has, get } from 'lodash';
import { logger } from '@services/logger.service';

/**
 * Checks if the user has the permission to update all the fields they're trying to update
 *
 * @param record The record to edit
 * @param newData The new data to set
 * @param ability The user ability
 * @returns If there's a field the user can't update
 */
export const hasInaccessibleFields = (
  record: Record,
  newData: any,
  ability: AppAbility
) => {
  const oldData = record.data || {};
  const k = union(keys(oldData), keys(newData));
  const updatedKeys = filter(k, (key) => {
    let oldD = get(oldData, key);
    let newD = get(newData, key);

    // check for date objects and convert them to strings
    if (oldD instanceof Date) oldD = oldD.toISOString();
    if (newD instanceof Date) newD = newD.toISOString();

    return !isEqual(get(oldD, key), get(newD, key));
  });

  return updatedKeys.some(
    (question) =>
      ability.cannot('update', record, `data.${question}`) &&
      has(newData, question)
  );
};

/**
 * Edit an existing record.
 * Create also an new version to store previous configuration.
 */
export default {
  type: RecordType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    data: { type: GraphQLJSON },
    version: { type: GraphQLID },
    template: { type: GraphQLID },
    lang: { type: GraphQLString },
    draft: { type: GraphQLBoolean },
  },
  async resolve(parent, args, context) {
    try {
      if (!args.data && !args.version) {
        throw new GraphQLError(
          context.i18next.t('mutations.record.edit.errors.invalidArguments')
        );
      }

      // Authentication check
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      // Get record and form
      const oldRecord: Record = await Record.findById(args.id);
      const parentForm: Form = await Form.findById(
        oldRecord.form,
        'fields permissions resource structure'
      );
      if (!oldRecord || !parentForm) {
        throw new GraphQLError(context.i18next.t('common.errors.dataNotFound'));
      }

      // Check permissions with two layers
      const ability = await extendAbilityForRecords(user, parentForm);
      if (
        ability.cannot('update', oldRecord) ||
        hasInaccessibleFields(oldRecord, args.data, ability)
      ) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
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
      let validationErrors;
      try {
        validationErrors = checkRecordValidation(
          oldRecord,
          args.data,
          parentForm,
          context,
          args.lang
        );
      } catch (err) {
        logger.error(err.message, { stack: err.stack });
      }
      if (validationErrors && validationErrors.length) {
        return Object.assign(oldRecord, { validationErrors });
      }
      const version = new Version({
        createdAt: oldRecord.modifiedAt
          ? oldRecord.modifiedAt
          : oldRecord.createdAt,
        data: oldRecord.data,
        createdBy: user._id,
      });
      let template: Form | Resource;
      if (!args.version) {
        if (args.template && parentForm.resource) {
          template = await Form.findById(args.template, 'fields resource');
          if (!(template as Form).resource.equals(parentForm.resource)) {
            throw new GraphQLError(
              context.i18next.t(
                'mutations.record.edit.errors.wrongTemplateProvided'
              )
            );
          }
        } else {
          if (parentForm.resource) {
            template = await Resource.findById(parentForm.resource, 'fields');
          } else {
            template = parentForm;
          }
        }
        transformRecord(args.data, template.fields);
        const update: any = {
          data: { ...oldRecord.data, ...args.data },
          lastUpdateForm: args.template,
          //modifiedAt: new Date(),
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
        const ownership = getOwnership(template.fields, args.data); // Update with template during merge
        Object.assign(
          update,
          ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
        );
        const record = Record.findByIdAndUpdate(args.id, update, { new: true });
        await version.save();
        return await record;
      } else {
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
        const record = Record.findByIdAndUpdate(args.id, update, { new: true });
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
