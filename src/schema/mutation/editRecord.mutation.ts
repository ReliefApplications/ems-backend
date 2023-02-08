import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record, Resource, Version } from '@models';
import extendAbilityForRecords from '@security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
} from '@utils/form';
import { RecordType } from '../types';
import mongoose from 'mongoose';
import { AppAbility } from 'security/defineUserAbility';
import { filter, isEqual, keys, union, has } from 'lodash';
import { logger } from '@services/logger.service';

/**
 * Chcecks if the user has the permission to update all the fields they're trying to update
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
  const oldData = record.data;
  const k = union(keys(oldData), keys(newData));
  const updatedKeys = filter(k, (key) => !isEqual(oldData[key], newData[key]));

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
  },
  async resolve(parent, args, context) {
    if (!args.data && !args.version) {
      throw new GraphQLError(
        context.i18next.t('mutations.record.edit.errors.invalidArguments')
      );
    }

    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
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
    if (!args.version) {
      let template: Form | Resource;
      if (args.template && parentForm.resource) {
        template = await Form.findById(args.template, 'fields resource');
        if (!template.resource.equals(parentForm.resource)) {
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
        //modifiedAt: new Date(),
        $push: { versions: version._id },
      };
      const ownership = getOwnership(template.fields, args.data); // Update with template during merge
      Object.assign(
        update,
        ownership && { createdBy: { ...oldRecord.createdBy, ...ownership } }
      );
      const record = Record.findByIdAndUpdate(args.id, update, { new: true });
      await version.save();
      return record;
    } else {
      const oldVersion = await Version.findOne({
        $and: [
          {
            _id: {
              $in: oldRecord.versions.map((x) => mongoose.Types.ObjectId(x)),
            },
          },
          { _id: args.version },
        ],
      });
      const update: any = {
        data: oldVersion.data,
        //modifiedAt: new Date(),
        $push: { versions: version._id },
      };
      const record = Record.findByIdAndUpdate(args.id, update, { new: true });
      await version.save();
      return record;
    }
  },
};
