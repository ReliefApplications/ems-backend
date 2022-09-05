import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { Form, Record, Resource, Version } from '../../models';
import extendAbilityForRecords from '../../security/extendAbilityForRecords';
import {
  transformRecord,
  getOwnership,
  checkRecordValidation,
} from '../../utils/form';
import { RecordType } from '../types';
import mongoose from 'mongoose';

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
        context.i18next.t('errors.invalidEditRecordArguments')
      );
    }

    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    // Get record and form
    const oldRecord: Record = await Record.findById(args.id);
    const parentForm: Form = await Form.findById(
      oldRecord.form,
      'fields permissions resource structure'
    );
    if (!oldRecord || !parentForm) {
      throw new GraphQLError(context.i18next.t('errors.dataNotFound'));
    }

    // Check permissions with two layers
    const ability = await extendAbilityForRecords(user, parentForm);
    if (ability.cannot('update', oldRecord)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }

    // Update record
    const validationErrors = checkRecordValidation(
      oldRecord,
      args.data,
      parentForm,
      args.lang
    );
    if (validationErrors.length) {
      return Object.assign(oldRecord, { validationErrors: validationErrors });
    }
    const version = new Version({
      createdAt: oldRecord.modifiedAt
        ? oldRecord.modifiedAt
        : oldRecord.createdAt,
      data: oldRecord.data,
      createdBy: user.id,
    });
    if (!args.version) {
      let template: Form | Resource;
      if (args.template && parentForm.resource) {
        template = await Form.findById(args.template, 'fields resource');
        if (!template.resource.equals(parentForm.resource)) {
          throw new GraphQLError(
            context.i18next.t('errors.wrongTemplateProvided')
          );
        }
      } else {
        if (parentForm.resource) {
          template = await Resource.findById(parentForm.resource, 'fields');
        } else {
          template = parentForm;
        }
      }
      await transformRecord(args.data, template.fields);
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
